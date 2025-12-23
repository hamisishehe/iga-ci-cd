package com.example.iga_veta.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Data
@Table(name = "centre")
public class Centre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(length = 20, nullable = true, unique = true )
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rank rank;

    @OneToMany(mappedBy = "centres")
    @JsonIgnore
    private List<User> userList;

    @OneToMany(mappedBy = "centre", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Customer> customers;

    @OneToMany(mappedBy = "centres")
    @JsonIgnore
    private List<Collections> collectionsList;

    @OneToMany(mappedBy = "centres")
    @JsonIgnore
    private List<Allocation> allocationList;

    @OneToMany(mappedBy = "centres")
    @JsonIgnore
    private List<Apposhment> apposhments;


    @ManyToOne
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zones;






    public enum Rank {
        A, B, C
    }
}