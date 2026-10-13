# HomeRepairsHub Application and Database Design

## 1. Scope

HomeRepairsHub supports two business modules:
- Home Appliance Services: service requests, bookings, technician assignment, estimates, repair progress, and feedback.
- Spare Parts Sales: catalogue, wishlist, cart, checkout, independent purchases, delivery tracking, returns, and feedback.

Spare parts can be sold independently or linked to a repair booking. A repair booking and a sales order are separate records and lifecycles. A repair can have a linked parts order, but neither workflow should implicitly complete or cancel the other.

## 2. Roles

- Customer: manage their own profile and addresses, create bookings, browse parts, manage wishlist/cart, place orders, pay, track, and leave feedback within allowed rules.
- Technician: access assigned jobs and only the technician functions explicitly granted by an Admin.
- Accountant: access finance functions only when explicitly granted by an Admin; cannot grant, change, or revoke access or permissions.
- Admin: the only role permitted to grant, change, or revoke roles and permissions, activate/deactivate accounts, and configure access to every module, including finance. Admin also manages catalogue, technicians, bookings, orders, stock, configuration, audit records, and operational reports.

All access grants must be performed through Admin-controlled workflows and enforced server-side on every protected route and record. No customer, technician, or accountant can elevate their own privileges, assign roles, or modify permission records. Hiding UI elements is not authorization.

## 3. Logical database schema

Use UUID primary keys, UTC timestamps, foreign keys, unique constraints, and explicit status values. Monetary values use integer minor units (for INR, paise) or an equivalent exact decimal type; never floating point.

### Identity and access

- profiles: id (matches authenticated identity subject), full_name, phone, created_at, updated_at.
- user_addresses: id, user_id -> profiles.id, label, recipient_name, phone, address_line1, address_line2, locality, city, state, postal_code, is_default, created_at.
- role_assignments: id, user_id, role (customer/technician/accountant/admin), status, created_at, created_by. Do not accept role changes from customer-facing clients.
- admin_users (if retained for the existing admin-auth design): auth_user_id, email, role, status, created_at, updated_at. Avoid maintaining two conflicting sources of truth for roles; document which table is authoritative before implementation.
- role_assignments / permission_assignments: changes may be made only by a verified Admin through a protected server-side endpoint; log actor, target, old/new values, timestamp, and reason in an append-only audit trail. Reject self-escalation and unauthorized changes.

### Catalogue and inventory

- appliance_categories: id, name, slug, active.
- appliance_brands: id, name, active.
- appliance_models: id, brand_id -> appliance_brands.id, category_id -> appliance_categories.id, model_number, active.
- products: id, sku (unique), name, slug, description, product_type (spare_part/service), category_id, brand_id nullable, sale_price_minor, currency, active, created_at, updated_at.
- product_compatibility: id, product_id -> products.id, appliance_model_id -> appliance_models.id, compatibility_note. A spare part may fit multiple models.
- product_media: id, product_id -> products.id, storage_key, alt_text, sort_order.
- inventory_locations: id, name, active.
- inventory_balances: id, product_id -> products.id, location_id -> inventory_locations.id, on_hand_qty, reserved_qty, updated_at. Enforce on_hand_qty >= 0, reserved_qty >= 0 and reserved_qty <= on_hand_qty.
- inventory_movements: id, product_id, location_id, movement_type (receipt/reserve/release/sale/repair_use/return/adjustment), quantity_delta, reference_type, reference_id, created_by, created_at, note. Treat this as an auditable stock ledger; update balances transactionally.

Services should have a dedicated service configuration table if pricing, duration, or service-area rules differ materially from physical products.

### Wishlist and cart

- wishlists: id, user_id -> profiles.id, created_at.
- wishlist_items: wishlist_id, product_id, created_at; unique(wishlist_id, product_id).
- carts: id, user_id -> profiles.id, status (active/converted/abandoned), created_at, updated_at.
- cart_items: id, cart_id -> carts.id, product_id -> products.id, quantity, unit_price_snapshot_minor, created_at, updated_at; unique(cart_id, product_id). Revalidate price, stock, and product active state at checkout.

### Service operations

- service_bookings: id, booking_number (unique), customer_id -> profiles.id, appliance_model_id nullable, appliance_description, issue_description, address_id, preferred_start_at, preferred_end_at, status (requested/confirmed/assigned/diagnosis/estimate_pending/approved/in_progress/completed/cancelled), customer_notes, created_at, updated_at.
- technician_profiles: user_id -> profiles.id, status (active/inactive/suspended), service_radius_km nullable, created_at, updated_at.
- technician_skills: technician_id -> technician_profiles.user_id, appliance_category_id -> appliance_categories.id; unique(technician_id, appliance_category_id).
- technician_availability: id, technician_id, start_at, end_at, availability_status (available/unavailable/leave), note. Prevent overlapping assignments using transactional checks and, where supported, database exclusion constraints.
- booking_assignments: id, booking_id -> service_bookings.id, technician_id -> technician_profiles.user_id, assigned_by, assigned_at, accepted_at, assignment_status (offered/accepted/rejected/reassigned/completed).
- service_diagnoses: id, booking_id, technician_id, diagnosis, recommended_action, created_at.
- service_estimates: id, booking_id, version, labour_amount_minor, parts_amount_minor, tax_amount_minor, total_amount_minor, currency, status (draft/sent/approved/rejected/expired), valid_until, created_at; preserve prior versions rather than overwriting approved estimates.
- service_estimate_items: id, estimate_id -> service_estimates.id, product_id nullable, item_description, quantity, unit_price_minor, line_total_minor, item_type (part/labour/other).
- booking_parts: id, booking_id -> service_bookings.id, product_id -> products.id, estimate_item_id nullable, quantity_planned, quantity_used, unit_price_snapshot_minor, status (proposed/reserved/used/returned).
- booking_status_history: id, booking_id, old_status, new_status, changed_by, note, created_at.

### Orders and fulfilment

- orders: id, order_number (unique), customer_id -> profiles.id, order_type (parts_sale/repair_parts), linked_booking_id nullable -> service_bookings.id, status (pending_payment/placed/confirmed/processing/shipped/delivered/cancelled/return_requested/returned), shipping_address_snapshot, subtotal_minor, discount_minor, tax_minor, shipping_minor, total_minor, currency, created_at, updated_at.
- order_items: id, order_id -> orders.id, product_id -> products.id, sku_snapshot, product_name_snapshot, quantity, unit_price_minor, tax_minor, line_total_minor, item_source (independent/repair_recommended), linked_booking_id nullable, created_at. Snapshot price/name/SKU so catalogue edits do not rewrite order history.
- order_status_history: id, order_id, old_status, new_status, changed_by, note, created_at.
- shipments: id, order_id -> orders.id, carrier, tracking_number, status, dispatched_at, delivered_at.
- returns: id, order_id, requested_by, reason, status, resolution, created_at, resolved_at.
- return_items: id, return_id, order_item_id, quantity, condition, restock_status.

A linked repair-parts order should have linked_booking_id populated. Independent purchases should leave it null. Do not require a service booking for a normal parts_sale order.

### Payments and finance

- payment_transactions: id, order_id nullable, booking_id nullable, provider, provider_reference (unique where present), amount_minor, currency, status (initiated/pending/succeeded/failed/refunded/partially_refunded), idempotency_key, created_at, updated_at. Require a valid order or booking reference and validate amounts server-side.
- refunds: id, payment_transaction_id, amount_minor, reason, status, provider_reference, requested_by, approved_by, created_at, completed_at.
- expenses: id, category, description, amount_minor, currency, incurred_at, submitted_by, status, approved_by, created_at.
- accounting_entries: id, entry_type, source_type, source_id, debit_minor, credit_minor, currency, entry_date, created_by, created_at. Append corrections/reversals instead of silently editing posted entries.
- finance_audit_log: id, actor_id, action, entity_type, entity_id, metadata_redacted, created_at.

Do not store raw card details. Use a payment provider and store only provider references and safe transaction metadata. The Admin alone grants or revokes accountant access and any finance permissions; accountants cannot administer roles or permissions. Apply least privilege to each granted finance action and record permission changes in the audit trail.

### Feedback and audit

- feedback: id, customer_id -> profiles.id, booking_id nullable, order_id nullable, product_id nullable, rating, comment, status (pending/published/hidden), created_at. Validate that feedback refers to at least one eligible service, order, or product and enforce business rules to reduce fake reviews.
- audit_logs: id, actor_id nullable, action, entity_type, entity_id, request_id, outcome, metadata_redacted, created_at. Never log passwords, access tokens, refresh tokens, payment secrets, or unnecessary personal data.
- notifications: id, user_id, channel, template_key, payload_redacted, status, created_at, sent_at.

## 4. Important relationships

- One customer has many addresses, bookings, carts, orders, payments, and feedback entries.
- One booking can have multiple assignment attempts, estimate versions, parts, status-history records, and optionally one or more linked parts orders.
- One product can appear in many cart items, wishlist items, order items, estimate items, and inventory movements.
- One order has multiple order items and status-history records; it may have shipment/return/payment records.
- Technician skill and availability must be checked before assignment; assignment must be protected against concurrent double-booking.
- Product catalogue and inventory are shared, but repair and sales fulfilment workflows remain distinct.

## 5. Critical transaction rules

1. Checkout must recheck product activity, compatibility if supplied, price, available stock, and address.
2. Create the order and reserve stock atomically. If payment fails or the reservation expires, release the reservation.
3. Use idempotency keys for checkout and payment callbacks to prevent duplicate orders or charges.
4. Decrease available inventory through a ledgered transaction only after the configured fulfilment event; define this consistently for sales and repair usage.
5. A repair estimate must be approved before non-emergency chargeable work or parts usage, according to the service policy.
6. A technician cannot be assigned to overlapping jobs; re-check availability inside the assignment transaction.
7. Record status transitions in history tables and validate allowed transitions server-side.
8. Never trust client-submitted totals, role values, stock quantities, or payment success claims.
9. Use row-level security or equivalent server-side authorization for customer-owned records. The Admin is the sole authority for granting/revoking access and permissions; all other roles are restricted to Admin-granted capabilities.
10. Keep staging and production credentials, databases, storage buckets, payment credentials, and webhook secrets separate.

## 6. Suggested API surface

- Authentication/profile: /api/auth/*, /api/account/*
- Catalogue: /api/products, /api/appliances, /api/compatibility
- Wishlist/cart: /api/wishlist, /api/cart
- Parts sales: /api/orders, /api/orders/:id, /api/orders/:id/cancel, /api/returns
- Services: /api/bookings, /api/bookings/:id, /api/bookings/:id/estimate, /api/bookings/:id/approve-estimate
- Technician: /api/technician/availability, /api/technician/assignments, /api/technician/jobs/:id/status
- Tracking: /api/tracking/orders/:id, /api/tracking/bookings/:id
- Feedback: /api/feedback
- Finance: /api/finance/* (access limited by permissions explicitly granted by Admin)
- Admin: /api/admin/* including protected role/permission management endpoints

Every endpoint must check identity, role, ownership, input validity, allowed state transitions, and the Admin-granted permission on the server. Non-admin calls to grant/change/revoke permissions must be rejected and audited.

## 7. Delivery phases

1. Staging foundation: confirm deployment branch/hostname, database choice, isolated staging credentials, migration process, and automated checks.
2. Identity and roles: sign-in/login, profile, addresses, server-side authorization, audit trail.
3. Catalogue and stock: appliances, brands/models, products, compatibility, inventory ledger.
4. Parts sales: wishlist, cart, checkout, order snapshots, payment integration in test mode, shipment/return lifecycle.
5. Service operations: bookings, technician skills/availability, assignments, diagnosis, estimates, linked parts and stock usage.
6. Customer experience: account page, My Orders, booking tracking, notifications, feedback.
7. Finance and admin: Admin-controlled role/permission management, accountant finance access only when granted by Admin, refunds, expenses, reconciliation, dashboards, and audit review.
8. QA and release: functional, API, authorization, concurrency, payment idempotency, stock integrity, accessibility, responsive, backup/restore, and staging regression tests.

## 8. Staging and production release gate

- Work only on the staging branch and staging infrastructure until approval.
- Never merge into main or change production DNS/configuration as part of staging implementation.
- Confirm the staging hostname actually serves the staging branch; a Git branch alone is not a deployment.
- Use a separate staging database and test credentials; never copy production secrets into staging.
- Require passing automated tests and manual acceptance for both independent parts purchases and repair-linked parts.
- Provide a release summary, test evidence, migration/rollback plan, and list of changed files.
- Promote only after explicit user approval.
