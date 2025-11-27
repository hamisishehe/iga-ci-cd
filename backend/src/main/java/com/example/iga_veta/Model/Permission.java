package com.example.iga_veta.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Data
@Table(name = "permission")
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(nullable = false, length = 100, unique = true)
    private String name;

    private String description;

    @OneToMany(mappedBy = "permissions")
    @JsonIgnore
    private List<RolePermission> permissionList;

}
