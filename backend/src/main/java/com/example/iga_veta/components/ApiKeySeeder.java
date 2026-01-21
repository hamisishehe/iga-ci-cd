package com.example.iga_veta.components;

import com.example.iga_veta.Model.ApiKey;
import com.example.iga_veta.Repository.ApiKeyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.UUID;

@Configuration
public class ApiKeySeeder {

    @Bean
    CommandLineRunner seedApiKeys(ApiKeyRepository apiKeyRepository) {
        return args -> {

            if (apiKeyRepository.count() == 0) {

                ApiKey adminKey = new ApiKey();
                adminKey.setApiKey("3dfeb4f9-8d10-4a81-a765-52f2ec5fbb5e");
                adminKey.setOwner("ADMIN_SYSTEM");
                adminKey.setActive(true);

                ApiKey serviceKey = new ApiKey();
                serviceKey.setApiKey("dcba992b-0071-45a7-8b61-4e1e3119582a");
                serviceKey.setOwner("ALLOCATION_SERVICE");
                serviceKey.setActive(true);

                apiKeyRepository.save(adminKey);
                apiKeyRepository.save(serviceKey);

                System.out.println("✅ API Keys seeded successfully");
                System.out.println("ADMIN KEY: " + adminKey.getApiKey());
                System.out.println("SERVICE KEY: " + serviceKey.getApiKey());
            }
        };
    }
}
