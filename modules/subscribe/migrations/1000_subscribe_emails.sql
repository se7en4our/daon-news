-- Email subscribers of the daily briefing (modules/subscribe). A row is created pending and becomes active
-- once its owner confirms through the emailed link (double opt-in); unsubscribing deletes the row.
CREATE TABLE subscribe_emails (
  id              bigserial PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  token           text NOT NULL UNIQUE,
  source_hash     text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  confirm_sent_at timestamptz,
  confirmed_at    timestamptz
);
