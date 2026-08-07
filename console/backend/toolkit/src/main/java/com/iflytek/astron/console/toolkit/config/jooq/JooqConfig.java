package com.iflytek.astron.console.toolkit.config.jooq;

import com.iflytek.astron.console.toolkit.util.database.dialect.DbDialect;
import org.jooq.DSLContext;
import org.jooq.conf.RenderQuotedNames;
import org.jooq.conf.Settings;
import org.jooq.impl.DSL;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JooqConfig {

    @Autowired
    private DbDialect dbDialect;

    @Bean
    public DSLContext dslContext() {
        Settings settings = new Settings()
                // Do not render schema
                .withRenderSchema(false)
                // Identifiers do not automatically include quotes (we handle whitelist/escaping ourselves)
                .withRenderQuotedNames(RenderQuotedNames.NEVER)
                // Do not execute SQL
                .withExecuteLogging(false)
                .withStatementType(org.jooq.conf.StatementType.STATIC_STATEMENT);
        // STATIC_STATEMENT: Only construct SQL template/parameters, do not attempt actual execution

        return DSL.using(dbDialect.jooqDialect(), settings);
    }
}
