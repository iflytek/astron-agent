package com.iflytek.astron.console.toolkit.util.database.dialect;

import com.iflytek.astron.console.toolkit.util.database.SqlRenderer;
import org.apache.commons.lang3.StringUtils;
import org.jooq.SQLDialect;

import java.util.List;

/**
 * MySQL dialect implementation. Uses backtick identifiers, BIGINT AUTO_INCREMENT, inline COMMENT,
 * MODIFY COLUMN, etc.
 */
public class MysqlDialect implements DbDialect {

    @Override
    public String quoteIdent(String name) {
        String n = SqlRenderer.validateIdent(name);
        return "`" + n.replace("`", "``") + "`";
    }

    @Override
    public String buildCreateTable(String tableName, List<ColumnDef> columns, String tableComment) {
        StringBuilder ddl = new StringBuilder();
        String table = quoteIdent(tableName);

        ddl.append("CREATE TABLE ")
                .append(table)
                .append(" (\n")
                .append("  ")
                .append(quoteIdent("id"))
                .append(" BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key id',\n")
                .append("  ")
                .append(quoteIdent("uid"))
                .append(" VARCHAR(64) NOT NULL COMMENT 'uid',\n")
                .append("  ")
                .append(quoteIdent("create_time"))
                .append(" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time'");

        for (ColumnDef col : columns) {
            ddl.append(",\n  ").append(quoteIdent(col.name())).append(" ").append(col.sqlType());
            if (col.notNull()) {
                ddl.append(" NOT NULL");
            }
            if (col.defaultValue() != null) {
                ddl.append(" DEFAULT ").append(col.defaultValue());
            }
            if (StringUtils.isNotBlank(col.comment())) {
                ddl.append(" COMMENT ").append(SqlRenderer.quoteLiteral(col.comment()));
            }
        }
        ddl.append("\n)");

        // Table-level comment
        if (StringUtils.isNotBlank(tableComment)) {
            ddl.append(" COMMENT=").append(SqlRenderer.quoteLiteral(tableComment));
        }
        ddl.append(";");

        return ddl.toString();
    }

    @Override
    public String buildAddColumn(String tableName, ColumnDef column) {
        StringBuilder sql = new StringBuilder();
        String table = quoteIdent(tableName);
        String col = quoteIdent(column.name());

        sql.append("ALTER TABLE ")
                .append(table)
                .append(" ADD COLUMN ")
                .append(col)
                .append(" ")
                .append(column.sqlType());
        if (column.notNull()) {
            sql.append(" NOT NULL");
        }
        if (column.defaultValue() != null) {
            sql.append(" DEFAULT ").append(column.defaultValue());
        }
        if (StringUtils.isNotBlank(column.comment())) {
            sql.append(" COMMENT ").append(SqlRenderer.quoteLiteral(column.comment()));
        }
        sql.append(";");
        return sql.toString();
    }

    @Override
    public String buildDropColumn(String tableName, String columnName) {
        String table = quoteIdent(tableName);
        String col = quoteIdent(columnName);
        return "ALTER TABLE " + table + " DROP COLUMN " + col + ";";
    }

    @Override
    public String buildModifyColumn(String tableName, ColumnModification mod) {
        StringBuilder sql = new StringBuilder();
        String table = quoteIdent(tableName);

        // MySQL: rename via CHANGE COLUMN (requires full definition)
        // modify via MODIFY COLUMN (requires full definition)
        if (!mod.oldName().equals(mod.newName())) {
            // CHANGE COLUMN old_name new_name full_definition
            sql.append("ALTER TABLE ")
                    .append(table)
                    .append(" CHANGE COLUMN ")
                    .append(quoteIdent(mod.oldName()))
                    .append(" ")
                    .append(quoteIdent(mod.newName()))
                    .append(" ")
                    .append(mod.newSqlType());
            appendModifyTail(sql, mod);
            sql.append(";");
        } else {
            // MODIFY COLUMN col full_definition
            sql.append("ALTER TABLE ")
                    .append(table)
                    .append(" MODIFY COLUMN ")
                    .append(quoteIdent(mod.newName()))
                    .append(" ")
                    .append(mod.newSqlType());
            appendModifyTail(sql, mod);
            sql.append(";");
        }

        return sql.toString();
    }

    private void appendModifyTail(StringBuilder sql, ColumnModification mod) {
        if (mod.newNotNull()) {
            sql.append(" NOT NULL");
        }
        if (mod.newDefault() != null) {
            sql.append(" DEFAULT ").append(mod.newDefault());
        }
        if (StringUtils.isNotBlank(mod.newComment())) {
            sql.append(" COMMENT ").append(SqlRenderer.quoteLiteral(mod.newComment()));
        }
    }

    @Override
    public String buildRenameTable(String oldName, String newName) {
        return "ALTER TABLE " + quoteIdent(oldName) + " RENAME TO " + quoteIdent(newName) + ";";
    }

    @Override
    public String buildTableComment(String tableName, String comment) {
        return "ALTER TABLE " + quoteIdent(tableName) + " COMMENT=" + SqlRenderer.quoteLiteral(comment) + ";";
    }

    @Override
    public SQLDialect jooqDialect() {
        return SQLDialect.MYSQL;
    }
}
