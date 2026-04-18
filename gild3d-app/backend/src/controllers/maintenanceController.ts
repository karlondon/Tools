import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Persisted in the uploads volume so it survives backend restarts
const STATE_FILE = path.join('/app/uploads', '.maintenance.json');

interface MaintenanceState {
  active: boolean;
  message: string;
  type: 'info' | 'warning' | 'error';
  endsAt: string | null;
  updatedAt: string;
}

const DEFAULT_STATE: MaintenanceState = {
  active: false, message: '', type: 'info', endsAt: null, updatedAt: new Date().toISOString(),
};

const readState = (): MaintenanceState => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return DEFAULT_STATE;
  }
};

const writeState = (state: MaintenanceState): void => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf-8');
  } catch (err: any) {
    console.error('Could not write maintenance state:', err.message);
  }
};

const checkKey = (req: Request, res: Response): boolean => {
  const provided = req.headers['x-maintenance-key'] as string | undefined;
  const secret = process.env.MAINTENANCE_SECRET;
  if (!provided || !secret) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
  } catch {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
};

export const getMaintenanceStatus = (_req: Request, res: Response) => {
  return res.json(readState());
};

export const setMaintenanceStatus = (req: Request, res: Response) => {
  if (!checkKey(req, res)) return;
  const body = req.body as Partial<MaintenanceState>;
  const current = readState();
  const updated: MaintenanceState = {
    active: typeof body.active === 'boolean' ? body.active : current.active,
    message: typeof body.message === 'string' ? body.message.slice(0, 500) : current.message,
    type: ['info', 'warning', 'error'].includes(body.type as string)
      ? (body.type as MaintenanceState['type'])
      : current.type,
    endsAt: typeof body.endsAt === 'string' || body.endsAt === null ? body.endsAt : current.endsAt,
    updatedAt: new Date().toISOString(),
  };
  writeState(updated);
  return res.json(updated);
};

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const sendMaintenanceAlert = async (req: Request, res: Response) => {
  if (!checkKey(req, res)) return;

  const { subject, message } = req.body;
  const recipients = [
    process.env.ADMIN_EMAIL,
    'wordpress.myblognow.uk@gmail.com',
  ].filter(Boolean);

  const timestamp = new Date().toUTCString();
  try {
    await mailer.sendMail({
      from: `"Gild3d System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject: `[GILD3D ALERT] ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:24px;border-radius:8px;border:1px solid #e57373;">
          <h2 style="color:#e57373;margin-top:0;">⚠ Gild3d System Alert</h2>
          <div style="background:#1a1a1a;padding:16px;border-radius:4px;margin-bottom:16px;">
            <pre style="color:#ddd;font-size:13px;white-space:pre-wrap;margin:0;">${message}</pre>
          </div>
          <hr style="border-color:#333;"/>
          <p style="color:#888;font-size:12px;margin:0;">
            Server: gild3d.com &nbsp;·&nbsp; ${timestamp}
          </p>
        </div>
      `,
    });
    return res.json({ sent: true, to: recipients });
  } catch (err: any) {
    console.error('Alert email error:', err.message);
    return res.status(500).json({ error: 'Failed to send alert' });
  }
};
