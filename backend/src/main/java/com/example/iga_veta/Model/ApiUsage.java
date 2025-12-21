package com.example.iga_veta.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;


@Entity
@Table(name = "api_usage")
@Data
public class ApiUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String apiKeyOwner;
    private String endpoint;
    private String method;
    private LocalDateTime timestamp;
}
