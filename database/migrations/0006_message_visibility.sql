-- Create table to track hidden analytics messages without altering the analytics schema
-- Presence of a row indicates the message (analytics row) is hidden in admin UI
CREATE TABLE IF NOT EXISTS message_visibility (
  analytics_id INTEGER PRIMARY KEY,
  hidden_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful index (PRIMARY KEY already indexed, but included for clarity)
CREATE INDEX IF NOT EXISTS idx_message_visibility_analytics_id
  ON message_visibility (analytics_id);


