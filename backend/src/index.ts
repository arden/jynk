import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initDatabase } from './db/index.js';

// Initialize database
initDatabase();

// Payment service for Solana
class PaymentService {
  static async checkProductAvailability(productId: string): Promise<{ available: boolean; reason?: string }> {
    const { getProductById } = await import('./db/index.js');
    const product = await getProductById(productId);
    
    if (!product) {
      return { available: false, reason: 'Product not found' };
    }

    if (!product.is_active) {
      return { available: false, reason: 'Product is not active' };
    }

    // Check max quantity limit
    if (product.max_quantity !== null && product.max_quantity > 0) {
      if (product.sold_count >= product.max_quantity) {
        return { available: false, reason: 'Product is sold out' };
      }
    }

    return { available: true };
  }

  static async verifyPayment(
    productId: string,
    txHash: string,
    buyerAddress: string
  ) {
    const { 
      getProductByIdInternal, 
      addPurchase, 
      updateProductSales,
      getPurchaseByTxHash,
      updateProfileEarnings 
    } = await import('./db/index.js');

    // 1. Get product (including inactive for payment verification)
    const product = await getProductByIdInternal(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // 2. Check product availability
    if (!product.is_active) {
      throw new Error('Product is not active');
    }

    // 3. Check max quantity
    if (product.max_quantity !== null && product.max_quantity > 0) {
      if (product.sold_count >= product.max_quantity) {
        throw new Error('Product is sold out');
      }
    }

    // 4. Check for duplicate purchase (replay protection)
    const existingPurchase = await getPurchaseByTxHash(txHash);
    if (existingPurchase) {
      throw new Error('This transaction has already been processed');
    }

    // 5. For Solana, we trust the wallet adapter's confirmation
    // In production, you should verify the transaction on-chain
    // using @solana/web3.js to confirm the payment

    // 6. Record purchase
    const purchaseId = `${txHash}_${Date.now()}`;
    await addPurchase({
      id: purchaseId,
      productId,
      buyerAddress,
      txHash,
      network: 'solana',
      amount: product.price,
    });

    // 7. Update product sales count
    await updateProductSales(productId);

    // 8. Update creator earnings
    await updateProfileEarnings(product.creator_address, product.price);

    return {
      txHash,
      unlockedContent: product.target_url,
    };
  }
}

// Create Elysia app
const app = new Elysia()
  .use(cors())
  .derive(({ request }) => {
    const address = request.headers.get('x-buyer-address') || 
                    new URL(request.url).searchParams.get('address');
    return { buyerAddress: address || '' };
  })

  // Health check
  .get('/health', () => ({
    status: 'ok',
    timestamp: Date.now(),
    database: 'connected',
  }))

  // ============ Payment Routes (Solana Only) ============

  .post('/api/pay/direct', async ({ body, set }) => {
    try {
      const { productId, txHash, network, buyerAddress } = body as any;
      
      // Validate required fields
      if (!productId || !txHash || !buyerAddress) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Missing required fields: productId, txHash, buyerAddress' 
        };
      }

      // Only support Solana
      if (network && network !== 'solana') {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Only Solana network is supported' 
        };
      }

      // Validate txHash format (Solana tx hash is 88 characters base58)
      if (!/^[a-zA-Z0-9]{88}$/.test(txHash)) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Invalid Solana transaction hash format' 
        };
      }

      const result = await PaymentService.verifyPayment(productId, txHash, buyerAddress);
      return { success: true, data: result };
    } catch (error) {
      console.error('Payment error:', error);
      set.status = 400;
      return { 
        success: false, 
        error: 'Payment Failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  })

  // ============ Product Routes ============

  .get('/api/products/:id', async ({ params, set }) => {
    try {
      const { getProductById } = await import('./db/index.js');
      const product = await getProductById(params.id);
      
      if (!product) {
        set.status = 404;
        return { success: false, error: 'Product not found' };
      }

      // Don't expose target_url to non-buyers
      const { target_url, encrypted_url, ...safeProduct } = product;
      
      return { 
        success: true, 
        data: {
          ...safeProduct,
          has_target: !!target_url,
        }
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .get('/api/creators/:address/products', async ({ params, query, set }) => {
    try {
      const { getProductsByCreator } = await import('./db/index.js');
      const includeInactive = query.includeInactive === 'true';
      const products = await getProductsByCreator(params.address, includeInactive);
      return { success: true, data: products };
    } catch (error) {
      console.error('Error fetching products:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .post('/api/products', async ({ body, set }) => {
    try {
      const { id, name, description, price, targetUrl, encryptedUrl, creatorAddress, maxQuantity } = body as any;
      
      // Validate required fields
      if (!id || !name || !targetUrl || !creatorAddress) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Missing required fields: id, name, targetUrl, creatorAddress' 
        };
      }

      // Validate price is non-negative
      if (price !== undefined && (isNaN(price) || price < 0)) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Price must be a non-negative number' 
        };
      }

      // Validate URL format
      try {
        new URL(targetUrl);
      } catch {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Invalid target URL format' 
        };
      }

      const { createProduct } = await import('./db/index.js');
      await createProduct({ 
        id, 
        name, 
        description, 
        price: price ?? 0, 
        targetUrl, 
        encryptedUrl, 
        creatorAddress, 
        maxQuantity 
      });
      
      return { success: true, data: { id } };
    } catch (error) {
      console.error('Failed to create product:', error);
      set.status = 500;
      return { 
        success: false, 
        error: 'Failed to create product', 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
  })

  .put('/api/products/:id', async ({ params, body, set }) => {
    try {
      const { updateProduct, getProductById } = await import('./db/index.js');
      
      // Check if product exists
      const existing = await getProductById(params.id);
      if (!existing) {
        set.status = 404;
        return { success: false, error: 'Product not found' };
      }

      // Validate price if provided
      if (body.price !== undefined && (isNaN(body.price) || body.price < 0)) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Price must be a non-negative number' 
        };
      }

      await updateProduct(params.id, body as any);
      return { success: true, data: { id: params.id } };
    } catch (error) {
      console.error('Failed to update product:', error);
      set.status = 500;
      return { success: false, error: 'Failed to update product' };
    }
  })

  .delete('/api/products/:id', async ({ params, set }) => {
    try {
      const { deleteProduct, getProductById } = await import('./db/index.js');
      
      // Check if product exists
      const existing = await getProductById(params.id);
      if (!existing) {
        set.status = 404;
        return { success: false, error: 'Product not found' };
      }

      await deleteProduct(params.id);
      return { success: true, data: { id: params.id } };
    } catch (error) {
      console.error('Failed to delete product:', error);
      set.status = 500;
      return { success: false, error: 'Failed to delete product' };
    }
  })

  // ============ Store Routes ============

  .get('/api/stores/:address', async ({ params, set }) => {
    try {
      console.log('GET /api/stores/:address called with:', params.address);
      const { getProfile, getSocialLinks, getProductsByCreator, findAddressByUsername } = await import('./db/index.js');
      
      let address = params.address;
      
      // First try to resolve as username
      const resolvedAddress = await findAddressByUsername(params.address);
      if (resolvedAddress) {
        console.log('Resolved username to address:', resolvedAddress);
        address = resolvedAddress;
      }
      
      const profile = await getProfile(address);
      console.log('Profile found:', profile);
      
      if (!profile) {
        set.status = 404;
        return { success: false, error: 'Store not found' };
      }
      
      const socials = await getSocialLinks(address);
      const products = await getProductsByCreator(address);
      
      return { 
        success: true, 
        data: { 
          ...profile, 
          username: profile.username,
          display_name: profile.display_name,
          socials, 
          products 
        } 
      };
    } catch (error) {
      console.error('Error fetching store:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .get('/api/username/:username', async ({ params, set }) => {
    try {
      const { findAddressByUsername } = await import('./db/index.js');
      const address = await findAddressByUsername(params.username);
      
      if (!address) {
        set.status = 404;
        return { success: false, error: 'Username not found' };
      }
      
      return { success: true, data: { address } };
    } catch (error) {
      console.error('Error finding username:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .put('/api/stores/:address', async ({ params, body, set }) => {
    try {
      const { updateProfile, setSocialLinks, upsertProfile, getProfile } = await import('./db/index.js');
      const { displayName, bio, avatar, theme, socials } = body as any;
      
      // Validate theme if provided
      const validThemes = ['midnight', 'ocean', 'sunset', 'forest', 'lavender', 'minimal'];
      if (theme && !validThemes.includes(theme)) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: `Invalid theme. Must be one of: ${validThemes.join(', ')}` 
        };
      }

      // Validate bio length
      if (bio && bio.length > 500) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Bio must be 500 characters or less' 
        };
      }
      
      // Check if profile exists, if not create it
      const existingProfile = await getProfile(params.address);
      if (!existingProfile && displayName) {
        await upsertProfile(params.address, displayName);
      }
      
      if (displayName || bio || avatar || theme) {
        await updateProfile(params.address, { displayName, bio, avatar, theme });
      }
      
      if (socials && Array.isArray(socials)) {
        // Validate socials format
        const validSocials = socials.filter(s => s.platform && s.url && typeof s.platform === 'string' && typeof s.url === 'string');
        await setSocialLinks(params.address, validSocials);
      }
      
      return { success: true, data: { address: params.address } };
    } catch (error) {
      console.error('Error updating store:', error);
      set.status = 500;
      return { success: false, error: 'Failed to update store' };
    }
  })

  .post('/api/stores/:address/views', async ({ params, set }) => {
    try {
      const { incrementViews, findAddressByUsername } = await import('./db/index.js');
      
      let address = params.address;
      const resolvedAddress = await findAddressByUsername(params.address);
      if (resolvedAddress) {
        address = resolvedAddress;
      }
      
      await incrementViews(address);
      return { success: true };
    } catch (error) {
      console.error('Error incrementing views:', error);
      set.status = 500;
      return { success: false, error: 'Failed to update views' };
    }
  })

  // ============ Username Routes ============

  .get('/api/username/:username/check', async ({ params, query, set }) => {
    try {
      const { isUsernameTaken } = await import('./db/index.js');
      const username = params.username.toLowerCase().replace(/^@/, '');
      const excludeAddress = query.address as string | undefined;
      
      // Validate username format
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only' 
        };
      }
      
      console.log('API /api/username/:username/check called with:', username, 'excludeAddress:', excludeAddress);
      const result = await isUsernameTaken(username, excludeAddress);
      console.log('API check result:', result, 'taken:', !!result);
      
      return { success: true, data: { available: !result, taken: !!result } };
    } catch (error) {
      console.error('Error checking username:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .post('/api/username/claim', async ({ body, set }) => {
    try {
      const { address, username } = body as any;
      
      if (!address || !username) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Missing required fields: address, username' 
        };
      }

      // Validate username format
      const normalizedUsername = username.toLowerCase().replace(/^@/, '');
      if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
        set.status = 400;
        return { 
          success: false, 
          error: 'Bad Request', 
          message: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only' 
        };
      }

      // Check if username is already taken
      const { isUsernameTaken } = await import('./db/index.js');
      const existing = await isUsernameTaken(normalizedUsername, address);
      if (existing) {
        set.status = 409;
        return { 
          success: false, 
          error: 'Conflict', 
          message: 'Username is already taken' 
        };
      }
      
      const { upsertProfile } = await import('./db/index.js');
      const displayName = `@${normalizedUsername}`;
      await upsertProfile(address, displayName, normalizedUsername);
      
      return { 
        success: true, 
        data: { 
          username: displayName, 
          storeUrl: `/s/${normalizedUsername}` 
        } 
      };
    } catch (error) {
      console.error('Error claiming username:', error);
      set.status = 500;
      return { success: false, error: 'Failed to claim username' };
    }
  })

  // ============ Purchase Routes ============

  .get('/api/products/:id/purchases', async ({ params, set }) => {
    try {
      const { getPurchasesByProduct } = await import('./db/index.js');
      const purchases = await getPurchasesByProduct(params.id);
      return { success: true, data: purchases };
    } catch (error) {
      console.error('Error fetching purchases:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .get('/api/buyers/:address/purchases', async ({ params, set }) => {
    try {
      const { getPurchasesByBuyer } = await import('./db/index.js');
      const purchases = await getPurchasesByBuyer(params.address);
      return { success: true, data: purchases };
    } catch (error) {
      console.error('Error fetching buyer purchases:', error);
      set.status = 500;
      return { success: false, error: 'Internal server error' };
    }
  })

  .listen(process.env.PORT || 3000);

const port = process.env.PORT || 3000;
console.log(`
🦊 Jynk Backend Server (Solana Only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server: http://localhost:${port}
📊 Health:  http://localhost:${port}/health
🔷 Network: Solana Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

export default app;
