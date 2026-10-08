-- One row per issue, channel and recipient: a daily briefing is sent to each at most once.
-- recipient is the Telegram chat id or the subscriber's id (no address is kept here).
CREATE TABLE subscribe_deliveries (
  channel    text NOT NULL CHECK (channel IN ('telegram', 'email')),
  report_key text NOT NULL,
  recipient  text NOT NULL,
  status     text NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  attempts   integer NOT NULL DEFAULT 1,
  error      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel, report_key, recipient)
);
