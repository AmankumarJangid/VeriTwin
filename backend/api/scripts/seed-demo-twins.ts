import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { pool } from '../src/db/pool';
import * as serial from '../src/services/serial';
import * as qrSigner from '../src/services/qrSigner';
import * as imageService from '../src/services/imageServiceClient';
import * as storage from '../src/services/storage';
import * as eventLog from '../src/services/eventLog';
import * as stateMachine from '../src/services/twinStateMachine';

async function seedDemoTwins() {
  console.log('🌱 Seeding demo twins...');
  const client = await pool.connect();

  try {
    // 1. Get Maker user
    const makerRes = await client.query(
      `SELECT id FROM users WHERE email = 'maker@veritwin.dev'`,
    );
    if (!makerRes.rows.length) {
      throw new Error('Maker user not found. Please run seed.ts first.');
    }
    const makerId = makerRes.rows[0].id;

    // 2. Get Retailer user
    const retailerRes = await client.query(
      `SELECT id FROM users WHERE email = 'retail@veritwin.dev'`,
    );
    if (!retailerRes.rows.length) {
      throw new Error('Retailer user not found. Please run seed.ts first.');
    }
    const retailerId = retailerRes.rows[0].id;

    // 3. Get Consumer user (Riya)
    const riyaRes = await client.query(
      `SELECT id FROM users WHERE email = 'riya@veritwin.dev'`,
    );
    if (!riyaRes.rows.length) {
      throw new Error('Riya user not found. Please run seed.ts first.');
    }
    const riyaId = riyaRes.rows[0].id;

    // 4. Get Product and Batch
    const prodRes = await client.query(
      `SELECT id, category FROM products WHERE sku = 'WCH-CHR-001'`,
    );
    if (!prodRes.rows.length) {
      throw new Error('Product WCH-CHR-001 not found.');
    }
    const product = prodRes.rows[0];

    const batchRes = await client.query(
      `SELECT id FROM batches WHERE product_id = $1 LIMIT 1`,
      [product.id],
    );
    if (!batchRes.rows.length) {
      throw new Error('Batch not found.');
    }
    const batchId = batchRes.rows[0].id;

    // 5. Read logo file
    const logoPath = path.join(__dirname, '../assets-sample/logo.png');
    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo file not found at ${logoPath}`);
    }
    const logoBuffer = fs.readFileSync(logoPath);

    // Save original logo once
    const originalLogoFilename = `${uuidv4()}.png`;
    storage.saveFile('originals', originalLogoFilename, logoBuffer);
    const originalLogoUrl = storage.buildUrl('originals', originalLogoFilename);

    const year = new Date().getFullYear();
    const createdTwinIds: string[] = [];

    // Create 5 twins
    for (let i = 0; i < 5; i++) {
      await client.query('BEGIN');

      const twinId = uuidv4();
      const twinCode = serial.generateTwinCode();

      const seqRes = await client.query<{ nextval: string }>(
        `SELECT nextval('twin_serial_seq')`,
      );
      const seq = parseInt(seqRes.rows[0].nextval, 10);
      const serialNumber = serial.generateSerialNumber(product.category, year, seq);

      // Watermark
      const watermarkedBuffer = await imageService.encode(logoBuffer, twinCode);
      const assetFilename = `${twinId}.png`;
      storage.saveFile('watermarked', assetFilename, watermarkedBuffer);
      const watermarkedLogoUrl = storage.buildUrl('watermarked', assetFilename);

      // QR
      const qrPayload = qrSigner.sign(twinId);
      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 2,
        width: 512,
      });
      storage.saveFile('qr', assetFilename, qrBuffer);
      const fallbackQrUrl = storage.buildUrl('qr', assetFilename);

      // Insert twin
      await client.query(
        `INSERT INTO digital_twins (
          id, twin_code, serial_number, product_id, batch_id, status,
          original_logo_url, watermarked_logo_url, fallback_qr_payload, fallback_qr_url,
          created_by
        ) VALUES ($1,$2,$3,$4,$5,'MANUFACTURED',$6,$7,$8,$9,$10)`,
        [
          twinId,
          twinCode,
          serialNumber,
          product.id,
          batchId,
          originalLogoUrl,
          watermarkedLogoUrl,
          qrPayload,
          fallbackQrUrl,
          makerId,
        ],
      );

      // Genesis event
      await eventLog.append(client, {
        twinId,
        eventType: 'MANUFACTURED',
        actorId: makerId,
        actorRole: 'MANUFACTURER',
        fromStatus: null,
        toStatus: 'MANUFACTURED',
        fromOwnerId: null,
        toOwnerId: null,
        notes: 'Manufactured at Jodhpur facility',
        metadata: { batch_id: batchId, serial_number: serialNumber },
      });

      await client.query('COMMIT');
      createdTwinIds.push(twinId);
      console.log(`  + Created twin [${i + 1}/5]: ${serialNumber} (${twinCode})`);
    }

    // Now advance statuses per spec:
    // Twin 0 & 1 -> QA_PASSED + DISPATCHED_TO_RETAIL
    for (let i = 0; i < 2; i++) {
      const tid = createdTwinIds[i];

      await client.query('BEGIN');
      await stateMachine.applyEvent(
        client,
        tid,
        'QA_PASSED',
        { id: makerId, role: 'MANUFACTURER' },
        { notes: 'Factory QA inspection passed' },
      );
      await stateMachine.applyEvent(
        client,
        tid,
        'DISPATCHED_TO_RETAIL',
        { id: makerId, role: 'MANUFACTURER' },
        {
          notes: 'Dispatched in Shipment #SH-001',
          metadata: { retailer_id: retailerId },
          currentRetailerId: retailerId,
        },
      );
      await client.query('COMMIT');
      console.log(`  -> Twin 0 and 1 transitioned to IN_TRANSIT`);
    }

    // Twin 1 -> RECEIVED_AT_RETAIL
    const tid1 = createdTwinIds[1];
    await client.query('BEGIN');
    await stateMachine.applyEvent(
      client,
      tid1,
      'RECEIVED_AT_RETAIL',
      { id: retailerId, role: 'RETAILER' },
      { notes: 'Received box in good condition' },
    );
    await client.query('COMMIT');
    console.log(`  -> Twin 1 transitioned to IN_RETAIL`);

    // Twin 1 -> SOLD to Riya
    await client.query('BEGIN');
    await stateMachine.applyEvent(
      client,
      tid1,
      'FIRST_SALE',
      { id: retailerId, role: 'RETAILER' },
      {
        toOwnerId: riyaId,
        notes: 'Sold at TimeHouse Retail flagship store',
        metadata: { invoice_no: 'INV-2026-001', sale_price: 24999.0 },
      },
    );
    await client.query('COMMIT');
    console.log(`  -> Twin 1 sold to Riya Sharma`);

    console.log('✅ Demo twin seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed demo twins:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedDemoTwins();
