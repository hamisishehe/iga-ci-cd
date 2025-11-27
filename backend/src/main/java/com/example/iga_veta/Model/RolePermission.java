package com.example.iga_veta.Model;


import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "role_permission")
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Enumerated(EnumType.STRING)
    private Role role;

    @ManyToOne
    @JoinColumn(name = "permission_id", unique = true)
    private Permission permissions;


    public enum Role{
        ADMIN, MANAGER, CASHIER, STAFF
    }
}
