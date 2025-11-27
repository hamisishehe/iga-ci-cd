package com.example.iga_veta.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.apache.commons.lang3.math.Fraction;

import java.text.DecimalFormat;
import java.util.List;

@Entity
@Data
@Table(name = "gfs_code")
public class GfsCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String code;


    @Column(nullable = false, length = 100)
    private String description;


    @Column(nullable = false, length = 100)
    private String markupPercent;

    @OneToMany(mappedBy = "gfs_code")
    @JsonIgnore
    private List<Collections> collectionsList;


    @OneToMany(mappedBy = "gfs_code")
    @JsonIgnore
    private List<DistributionFormula> distributionFormulaList;



}
