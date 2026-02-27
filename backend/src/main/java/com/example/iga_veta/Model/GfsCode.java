package com.example.iga_veta.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.math.Fraction;

import java.text.DecimalFormat;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor

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

    @OneToMany(mappedBy = "gfsCode")
    @JsonIgnore
    private List<Collections> collectionsList;

    @OneToMany(mappedBy = "gfsCode")
    @JsonIgnore
    private List<Payment> paymentsList;


    @OneToMany(mappedBy = "gfsCode")
    @JsonIgnore
    private List<DistributionFormula> distributionFormulaList;



}
