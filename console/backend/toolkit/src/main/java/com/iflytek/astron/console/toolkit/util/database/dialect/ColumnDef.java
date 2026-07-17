package com.iflytek.astron.console.toolkit.util.database.dialect;

/**
 * Value object describing a column definition for DDL generation.
 *
 * @param name         validated column name (unquoted)
 * @param sqlType      SQL type string, e.g. "VARCHAR", "BIGINT"
 * @param notNull      whether the column has a NOT NULL constraint
 * @param defaultValue already-rendered default value expression (e.g. "'hello'", "0", "NULL"), or null if none
 * @param comment      human-readable column comment, or null
 */
public record ColumnDef(
        String name,
        String sqlType,
        boolean notNull,
        String defaultValue,
        String comment) {
}
