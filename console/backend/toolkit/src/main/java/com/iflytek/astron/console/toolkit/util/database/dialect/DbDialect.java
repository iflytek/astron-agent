package com.iflytek.astron.console.toolkit.util.database.dialect;

import org.jooq.SQLDialect;

import java.util.List;

/**
 * Strategy interface for database-specific SQL generation. Implementations handle the syntactic
 * differences between PostgreSQL and MySQL.
 */
public interface DbDialect {

    /** Quote an identifier (table name, column name) using the dialect's quoting character. */
    String quoteIdent(String name);

    /**
     * Build a CREATE TABLE DDL statement.
     *
     * @param tableName validated table name (unquoted)
     * @param columns user-defined columns (excluding system columns id/uid/create_time)
     * @param tableComment table-level comment, or null
     * @return complete DDL string (may contain multiple statements separated by semicolons)
     */
    String buildCreateTable(String tableName, List<ColumnDef> columns, String tableComment);

    /**
     * Build an ADD COLUMN statement.
     *
     * @param tableName validated table name (unquoted)
     * @param column column to add
     * @return DDL string (may contain multiple statements for PG comment)
     */
    String buildAddColumn(String tableName, ColumnDef column);

    /**
     * Build a DROP COLUMN statement.
     *
     * @param tableName validated table name (unquoted)
     * @param columnName validated column name (unquoted)
     * @return DDL string
     */
    String buildDropColumn(String tableName, String columnName);

    /**
     * Build a MODIFY/ALTER COLUMN statement.
     *
     * @param tableName validated table name (unquoted)
     * @param modification column modification descriptor
     * @return DDL string (may contain multiple statements)
     */
    String buildModifyColumn(String tableName, ColumnModification modification);

    /**
     * Build a RENAME TABLE statement.
     *
     * @param oldName original table name (unquoted)
     * @param newName target table name (unquoted)
     * @return DDL string
     */
    String buildRenameTable(String oldName, String newName);

    /**
     * Build a table comment statement.
     *
     * @param tableName validated table name (unquoted)
     * @param comment table comment text
     * @return DDL string
     */
    String buildTableComment(String tableName, String comment);

    /** Return the jOOQ SQLDialect constant for this database. */
    SQLDialect jooqDialect();
}
