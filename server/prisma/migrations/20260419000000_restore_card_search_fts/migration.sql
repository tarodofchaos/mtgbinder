-- Full Text Search Restore
ALTER TABLE "cards" ADD COLUMN "name_tsvector" tsvector;

-- Create function to update tsvector (if it was dropped, though usually functions persist unless explicitly dropped)
CREATE OR REPLACE FUNCTION cards_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  new.name_tsvector :=
    setweight(to_tsvector('english', COALESCE(new.name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(new."nameEs", '')), 'B');
  return new;
END
$$ LANGUAGE plpgsql;

-- Create trigger (dropped when column was dropped or by the drop migration)
DROP TRIGGER IF EXISTS cards_tsvector_update ON cards;
CREATE TRIGGER cards_tsvector_update BEFORE INSERT OR UPDATE
ON cards FOR EACH ROW EXECUTE FUNCTION cards_tsvector_trigger();

-- Initialize existing data
UPDATE cards SET name_tsvector = 
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE("nameEs", '')), 'B');

-- Create GIN index
CREATE INDEX cards_name_tsvector_idx ON cards USING GIN (name_tsvector);
