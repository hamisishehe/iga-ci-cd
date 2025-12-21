package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findByApiKeyAndActiveTrue(String apiKey);
}
