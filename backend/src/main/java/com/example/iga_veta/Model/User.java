package com.example.iga_veta.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Data
@Table(
        name = "users",
        indexes = {
        @Index(name = "idx_centre_id", columnList = "centre_id"),
        @Index(name = "idx_department_id", columnList = "department_id")
})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String middleName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String userName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    private UserType userType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;


    @ManyToOne
    @JoinColumn(name = "centre_id", nullable = true)
    private Centre centres;

    @ManyToOne
    @JsonIgnore
    @JoinColumn(name = "department_id", nullable = true)
    private Department departments;


    @OneToMany( mappedBy = "users")
    @JsonIgnore
    private List<AuditLog> auditLogList;

    @ManyToMany()
    @JoinTable(
            name = "user_permissions",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private List<Permission> permissions;


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



    public enum Role{
        ADMIN, MANAGER, CASHIER, STAFF, DG,DF,RFM,CHIEF_ACCOUNTANT,ACCOUNTANT
    }

    public enum UserType{
        CENTRE, ZONE, HQ
    }

    public enum Status {
        ACTIVE, INACTIVE, PENDING
    }



}


