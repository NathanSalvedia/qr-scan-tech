import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  numeric,
} from 'drizzle-orm/pg-core';

// PostgreSQL Enum matching your pgAdmin schema
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

// Users Table (Exact match to PostgreSQL columns)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// OTPs Table
export const otps = pgTable('otps', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  otpCode: varchar('otp_code', { length: 6 }).notNull(),
  mode: varchar('mode', { length: 50 }).default('verification').notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Zones Table
export const zones = pgTable('zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Distribution Boxes Table (Exact match to PostgreSQL columns)
export const distributionBoxes = pgTable('distribution_boxes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  category: varchar('category', { length: 20 }).default('SUB_BOX').notNull(),
  parentBoxId: uuid('parent_box_id'),
  siteName: varchar('site_name', { length: 150 }).notNull(),
  address: text('address').notNull(),
  zoneId: uuid('zone_id'),
  mountingType: varchar('mounting_type', { length: 40 }).default('Utility Pole').notNull(),
  poleNumber: varchar('pole_number', { length: 60 }),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  totalPorts: integer('total_ports').default(24).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  qrToken: varchar('qr_token', { length: 120 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Client Connections Table
export const clientConnections = pgTable('client_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  boxId: uuid('box_id').notNull(),
  portNumber: integer('port_number').notNull(),
  accountNumber: varchar('account_number', { length: 100 }).notNull(),
  customerName: varchar('customer_name', { length: 150 }).notNull(),
  servicePlan: varchar('service_plan', { length: 100 }),
  signalDbm: varchar('signal_dbm', { length: 50 }),
  status: varchar('status', { length: 50 }).default('CONNECTED').notNull(),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow(),
});

// Equipment Catalog Table
export const equipmentCatalog = pgTable('equipment_catalog', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }),
  equipmentType: varchar('equipment_type', { length: 50 }),
  specifications: text('specifications'),
});

// Box Equipment Table
export const boxEquipment = pgTable('box_equipment', {
  id: uuid('id').defaultRandom().primaryKey(),
  boxId: uuid('box_id').notNull(),
  catalogId: varchar('catalog_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('OPERATIONAL'),
  installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow(),
});

// QR Dispatches Table (Matching PostgreSQL qr_dispatches table)
export const qrDispatches = pgTable('qr_dispatches', {
  id: uuid('id').defaultRandom().primaryKey(),
  boxId: uuid('box_id').notNull(),
  dispatchedBy: uuid('dispatched_by').notNull(),
  batchNumber: varchar('batch_number', { length: 60 }),
  stickerSize: varchar('sticker_size', { length: 30 }).default('50x50mm Door Placard'),
  tagStatus: varchar('tag_status', { length: 20 }).default('PENDING_AFFIX').notNull(),
  printedAt: timestamp('printed_at', { withTimezone: true }).defaultNow().notNull(),
  affixedAt: timestamp('affixed_at', { withTimezone: true }),
});

// Scan Audit Logs Table (Matching PostgreSQL scan_audit_logs table)
export const scanAuditLogs = pgTable('scan_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  boxId: uuid('box_id').notNull(),
  technicianId: uuid('technician_id').notNull(),
  scanType: varchar('scan_type', { length: 50 }).default('CAMERA_QR').notNull(),
  padlockVerified: boolean('padlock_verified').default(true).notNull(),
  measuredSignal: varchar('measured_signal', { length: 50 }),
  measuredTemp: varchar('measured_temp', { length: 50 }),
  auditNotes: text('audit_notes'),
  photoUrl: varchar('photo_url', { length: 255 }),
  boxStatusAtScan: varchar('box_status_at_scan', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
