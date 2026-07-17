package com.iflytek.astron.console.toolkit.util.database.dialect;

/**
 * Value object describing a column modification (ALTER COLUMN / MODIFY COLUMN).
 * MySQL's MODIFY COLUMN requires the full column definition, so we carry both old and new state.
 *
 * @param oldName      original column name (unquoted)
 * @param newName      target column name (unquoted); same as oldName if not renamed
 * @param newSqlType   new SQL type string
 * @param newNotNull   new NOT NULL state
 * @param newDefault   new rendered default value expression, or null
 * @param newComment   new column comment, or null
 * @param typeChanged  whether the SQL type changed
 * @param defaultChanged whether the default value changed
 * @param commentChanged whether the comment changed
 */
public record ColumnModification(
        String oldName,
        String newName,
        String newSqlType,
        boolean newNotNull,
        String newDefault,
        String newComment,
        boolean typeChanged,
        boolean defaultChanged,
        boolean commentChanged) {
}
