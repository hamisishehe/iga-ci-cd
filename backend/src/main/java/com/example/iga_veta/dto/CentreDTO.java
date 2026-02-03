package com.example.iga_veta.dto;

import com.example.iga_veta.Model.Centre;
import lombok.Data;

@Data
public class CentreDTO {
    private Long id;
    private String name;
    private String code;
    private String rank;

    public CentreDTO(Centre centre) {
        if (centre != null) {
            this.id = centre.getId();
            this.name = centre.getName();
            this.code = centre.getCode();
            this.rank = centre.getRank() != null ? centre.getRank().name() : null;
        }
    }
}
