\getenv app_user APP_DB_USER
\getenv app_password APP_DB_PASSWORD

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')
\gexec

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL DEFAULT '',
    company VARCHAR(120) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'lead'
        CHECK (status IN ('lead', 'contacted', 'customer')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_status_idx ON customers(status);
CREATE INDEX IF NOT EXISTS customers_created_at_idx ON customers(created_at DESC);

INSERT INTO customers (name, email, phone, company, status, notes) VALUES
    ('Nguyen Minh Anh', 'minh.anh@example.com', '0901234567', 'Sao Viet', 'customer', 'Khach hang demo'),
    ('Tran Quoc Bao', 'quoc.bao@example.com', '0912345678', 'Moc Lan', 'contacted', 'Da goi dien tu van'),
    ('Le Thu Ha', 'thu.ha@example.com', '0987654321', 'An Phat', 'lead', 'Khach hang tiem nang')
ON CONFLICT (email) DO NOTHING;

GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
GRANT pg_monitor TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
