-- Preview and embedded rows contain serialized chunk JSON with both content
-- and context. LONGTEXT covers the full supported upload size even when a
-- delimiter-free document remains one chunk and multibyte text is duplicated.
ALTER TABLE `preview_knowledge`
    MODIFY COLUMN `content` LONGTEXT NULL;

ALTER TABLE `knowledge`
    MODIFY COLUMN `content` LONGTEXT NULL;
