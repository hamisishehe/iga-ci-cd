package com.example.iga_veta.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@Table(
        name = "customer",
        indexes = {
                @Index(name = "idx_admission_number", columnList = "admissionNumber"),
                @Index(name = "idx_phone_number", columnList = "phoneNumber"),
                @Index(name = "idx_centre_id", columnList = "centre_id"),

                // ✅ supports fast lookup for findByNameAndCentre_Id
                @Index(name = "idx_customer_name_centre", columnList = "name, centre_id")
        }
        // ✅ optional: enable only if name is guaranteed unique per centre
        // ,uniqueConstraints = {
        //     @UniqueConstraint(name = "uk_customer_name_centre", columnNames = {"name", "centre_id"})
        // }
)
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String email;

    @Column(length = 50)
    private String admissionNumber;

    @Column(length = 20)
    private String phoneNumber;

    @Column(length = 100)
    private String payStation;

    @ManyToOne(optional = false)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    // ✅ safer: don't cascade ALL (avoid accidental deletes/updates)
    @OneToMany(mappedBy = "customer")
    @JsonIgnore
    private List<Collections> collectionsList;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
