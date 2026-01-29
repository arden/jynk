import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initDatabase } from './db/index.js';
import { X402Service } from './services/x402.js';

// Initialize database
initDatabase();

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

  // ============ x402 Payment Routes ============

  .post('/api/x402/verify/:productId', async ({ params, request, buyerAddress, set }) => {
    try {
      const { productId } = params;
      const paymentHeader = request.headers.get('x-payment');

      if (!paymentHeader) {
        set.status = 402;
        return { error: 'Payment Required', message: 'X-PAYMENT header is required' };
      }

      if (!buyerAddress) {
        set.status = 400;
        return { error: 'Bad Request', message: 'Buyer address is required' };
      }

      const result = await X402Service.verifyPayment(productId, paymentHeader, buyerAddress);
      return { success: true, data: result };
    } catch (error) {
      console.error('Payment verification error:', error);
      set.status = 402;
      return { error: 'Payment Failed', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  .post('/api/pay/direct', async ({ body, set }) => {
    try {
      const { productId, txHash, network, buyerAddress } = body as any;
      if (!productId || !txHash || !network || !buyerAddress) {
        set.status = 400;
        return { error: 'Missing required fields' };
      }
      const result = await X402Service.verifyDirectPayment(productId, txHash, network, buyerAddress);
      return { success: true, data: result };
    } catch (error) {
      set.status = 400;
      return { error: 'Payment Failed', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  // ============ Product Routes ============

  .get('/api/products/:id', async ({ params }) => {
    const { getProductById } = await import('./db/index.js');
    const product = await getProductById(params.id);
    if (!product) return { error: 'Product not found' };
    return { success: true, data: product };
  })

  .get('/api/creators/:address/products', async ({ params, query }) => {
    const { getProductsByCreator } = await import('./db/index.js');
    const includeInactive = query.includeInactive === 'true';
    const products = await getProductsByCreator(params.address, includeInactive);
    return { success: true, data: products };
  })

  .post('/api/products', async ({ body, set }) => {
    try {
      const { id, name, description, price, targetUrl, encryptedUrl, creatorAddress, maxQuantity } = body as any;
      console.log('Creating product:', { id, name, creatorAddress });
      if (!id || !name || !targetUrl || !creatorAddress) {
        set.status = 400;
        return { error: 'Missing required fields' };
      }
      const { createProduct } = await import('./db/index.js');
      await createProduct({ id, name, description, price, targetUrl, encryptedUrl, creatorAddress, maxQuantity });
      return { success: true, data: { id } };
    } catch (error) {
      console.error('Failed to create product:', error);
      set.status = 500;
      return { error: 'Failed to create product', message: error instanceof Error ? error.message : String(error) };
    }
  })

  .put('/api/products/:id', async ({ params, body }) => {
    const { updateProduct } = await import('./db/index.js');
    await updateProduct(params.id, body as any);
    return { success: true, data: { id: params.id } };
  })

  .delete('/api/products/:id', async ({ params }) => {
    const { deleteProduct } = await import('./db/index.js');
    await deleteProduct(params.id);
    return { success: true, data: { id: params.id } };
  })

  // ============ Store Routes ============

  .get('/api/stores/:address', async ({ params }) => {
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
    if (!profile) return { error: 'Store not found' };
    const socials = await getSocialLinks(address);
    const products = await getProductsByCreator(address);
    // Return both username and display_name
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
  })

  .get('/api/username/:username', async ({ params }) => {
    const { findAddressByUsername } = await import('./db/index.js');
    const address = await findAddressByUsername(params.username);
    if (!address) return { error: 'Username not found' };
    return { success: true, data: { address } };
  })

  .put('/api/stores/:address', async ({ params, body }) => {
    const { updateProfile, setSocialLinks, upsertProfile, getProfile } = await import('./db/index.js');
    const { displayName, bio, avatar, theme, socials } = body as any;
    
    // Check if profile exists, if not create it
    const existingProfile = await getProfile(params.address);
    if (!existingProfile && displayName) {
      await upsertProfile(params.address, displayName);
    }
    
    if (displayName || bio || avatar || theme) {
      await updateProfile(params.address, { displayName, bio, avatar, theme });
    }
    if (socials && Array.isArray(socials)) {
      await setSocialLinks(params.address, socials);
    }
    return { success: true, data: { address: params.address } };
  })

  .post('/api/stores/:address/views', async ({ params }) => {
    const { incrementViews, findAddressByUsername } = await import('./db/index.js');
    
    let address = params.address;
    const resolvedAddress = await findAddressByUsername(params.address);
    if (resolvedAddress) {
      address = resolvedAddress;
    }
    
    await incrementViews(address);
    return { success: true };
  })

  // ============ Username Routes ============

  .get('/api/username/:username/check', async ({ params, query }) => {
    const { isUsernameTaken } = await import('./db/index.js');
    const username = params.username.toLowerCase().replace(/^@/, '');
    const excludeAddress = query.address as string | undefined;
    console.log('API /api/username/:username/check called with:', username, 'excludeAddress:', excludeAddress);
    const result = await isUsernameTaken(username, excludeAddress);
    console.log('API check result:', result, 'taken:', !!result);
    return { success: true, data: { available: !result, taken: !!result } };
  })

  .post('/api/username/claim', async ({ body, set }) => {
    try {
      const { address, username } = body as any;
      if (!address || !username) {
        set.status = 400;
        return { error: 'Missing required fields' };
      }
      const { upsertProfile } = await import('./db/index.js');
      await upsertProfile(address, username.startsWith('@') ? username : `@${username}`);
      return { success: true, data: { username: `@${username.replace(/^@/, '')}`, storeUrl: `/s/@${username.replace(/^@/, '')}` } };
    } catch (error) {
      set.status = 500;
      return { error: 'Failed to claim username' };
    }
  })

  // ============ Purchase Routes ============

  .get('/api/products/:id/purchases', async ({ params }) => {
    const { getPurchasesByProduct } = await import('./db/index.js');
    const purchases = await getPurchasesByProduct(params.id);
    return { success: true, data: purchases };
  })

  .get('/api/buyers/:address/purchases', async ({ params }) => {
    const { getPurchasesByBuyer } = await import('./db/index.js');
    const purchases = await getPurchasesByBuyer(params.address);
    return { success: true, data: purchases };
  })

  .listen(3000);

console.log(`
🦊 Jynk Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server: http://localhost:3000
📊 Health:  http://localhost:3000/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

export default app;
