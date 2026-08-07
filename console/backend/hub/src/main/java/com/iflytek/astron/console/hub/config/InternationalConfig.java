package com.iflytek.astron.console.hub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

import java.util.Locale;

@Configuration
public class InternationalConfig implements WebMvcConfigurer {

    /** Configure default locale resolver, use Session to store locale information */
    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        // Set default language to Chinese
        localeResolver.setDefaultLocale(Locale.CHINA);
        return localeResolver;
    }

    /**
     * Configure locale change interceptor, switch language through request parameter "lang". Example:
     * ?lang=en_US to switch to English, ?lang=zh_CN to switch to Chinese
     */
    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }

    /** Register interceptors */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor());
    }

    /** Configure message source, load internationalization resource files */
    @Bean
    public ResourceBundleMessageSource messageSource() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        // Set resource file base names, corresponding to messages.properties and speaker.properties files
        // under classpath
        messageSource.setBasenames("messages", "speaker");
        // Set encoding format
        messageSource.setDefaultEncoding("UTF-8");
        // Whether to use default message when corresponding message is not found
        messageSource.setUseCodeAsDefaultMessage(true);
        return messageSource;
    }
}
