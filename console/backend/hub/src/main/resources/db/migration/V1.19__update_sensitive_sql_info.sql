-- Remove legacy sensitive SQL-related configuration: delete SPECIAL_USER category entries
DELETE FROM astron_console.config_info WHERE category = 'SPECIAL_USER';
-- Remove legacy sensitive SQL-related configuration: delete SPECIAL_MODEL category entries
DELETE FROM astron_console.config_info WHERE category = 'SPECIAL_MODEL';
