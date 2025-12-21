package com.example.iga_veta.components;


import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Repository.ApiKeyRepository;
import com.example.iga_veta.Repository.ApiUsageRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;

@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    private final ApiKeyRepository apiKeyRepository;
    private final ApiUsageRepository apiUsageRepository;

    public ApiKeyFilter(ApiKeyRepository apiKeyRepository, ApiUsageRepository apiUsageRepository) {
        this.apiKeyRepository = apiKeyRepository;
        this.apiUsageRepository = apiUsageRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // ✅ Allow OPTIONS requests for CORS preflight
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader("X-API-KEY");
        if (apiKey == null || apiKey.isBlank()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("API Key is missing");
            return;
        }

        var keyOpt = apiKeyRepository.findByApiKeyAndActiveTrue(apiKey);
        if (keyOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Invalid API Key");
            return;
        }

        // ✅ Authenticate the request
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        keyOpt.get().getOwner(),
                        null,
                        Collections.emptyList()
                );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // ✅ Log API usage
        try {
            ApiUsage usage = new ApiUsage();
            usage.setApiKeyOwner(keyOpt.get().getOwner());
            usage.setEndpoint(request.getRequestURI());
            usage.setMethod(request.getMethod());
            usage.setTimestamp(LocalDateTime.now());

            // Optionally, if JWT username is available
            var principal = SecurityContextHolder.getContext().getAuthentication().getName();
            if (principal != null) {
                usage.setUsername(principal);
            }

            apiUsageRepository.save(usage);

        } catch (Exception e) {
            e.printStackTrace(); // logging should not block the request
        }

        filterChain.doFilter(request, response);
    }
}
