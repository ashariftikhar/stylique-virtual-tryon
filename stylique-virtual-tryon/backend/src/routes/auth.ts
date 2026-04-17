import express from 'express';
import type { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getSupabase } from '../services/supabase.ts';
import { getJwtSecret } from '../middleware/auth.ts';

const router: Router = express.Router();

const SALT_ROUNDS = 10;

interface RegisterPayload {
  store_name: string;
  store_id: string;
  email?: string | null;
  password: string;
}

interface LoginPayload {
  store_id: string;
  password: string;
}

// POST /api/auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: RegisterPayload = req.body;

    // Validate required fields
    if (!payload.store_name || !payload.store_id || !payload.password) {
      return res.status(400).json({
        error: 'Missing required fields: store_name, store_id, password',
      });
    }

    if (payload.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if store_id already exists
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', payload.store_id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'A store with this ID already exists' });
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        store_name: payload.store_name,
        store_id: payload.store_id,
        email: payload.email || null,
        password_hash: passwordHash,
        subscription_name: 'FREE',
        tryons_quota: 100,
        tryons_used: 0,
      })
      .select('id, store_name, store_id, email')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create store', details: error.message });
    }

    const token = jwt.sign(
      { storeId: store.id, store_id: store.store_id },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    res.status(201).json({
      success: true,
      store,
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: LoginPayload = req.body;

    if (!payload.store_id || !payload.password) {
      return res.status(400).json({ error: 'Missing required fields: store_id, password' });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, store_name, store_id, email, phone, password_hash, subscription_name, tryons_quota, tryons_used')
      .eq('store_id', payload.store_id)
      .maybeSingle();

    if (storeError || !store) {
      return res.status(401).json({ error: 'Invalid store ID or password' });
    }

    if (!store.password_hash) {
      return res.status(401).json({ error: 'This store has no password set. Please register first.' });
    }

    const passwordValid = await bcrypt.compare(payload.password, store.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid store ID or password' });
    }

    const token = jwt.sign(
      { storeId: store.id, store_id: store.store_id },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    const { password_hash: _, ...safeStore } = store;

    res.status(200).json({
      success: true,
      store: safeStore,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
