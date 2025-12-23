package com.example.iga_veta.Service;


import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Zone;
import com.example.iga_veta.Repository.CentreRepository;
import com.example.iga_veta.Repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CentreService {

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private ZoneRepository zoneRepository;


    public String createCentre(String name, String rank, Long zoneId) {
        // Check if centre with same name already exists
        if (centreRepository.existsByName(name)) {
            throw new RuntimeException("Centre with name '" + name + "' already exists");
        }

        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new RuntimeException("Zone not found with id: " + zoneId));


        Centre centre1 = new Centre();
        centre1.setName(name.trim());
        centre1.setZones(zone);
        centre1.setCode(generateCentreCode(name, zoneId));
        centre1.setRank(Centre.Rank.valueOf(rank.trim()));

        centreRepository.save(centre1);
        return "Centre created successfully";
    }
    public Centre saveCentre(String name, String code, String rank){

        Centre centre = new Centre();
        centre.setName(name);
        centre.setCode(code);
        centre.setRank(Centre.Rank.valueOf(rank));
        centreRepository.save(centre);

        return centre;
    }
    public List<Centre> getCentres(){
        return centreRepository.findAll();
    }

    public Centre getCentreById(Long id){
        return centreRepository.findById(id).orElseThrow();
    }

    public Centre getCentreByName(String name){
        return centreRepository.getCentreByName(name).orElseThrow();
    }

    public Centre getCentreByCode(String code){
        return centreRepository.getCentreByCode(code).orElseThrow();
    }


    public String updateCentre(Long centreId, Centre updatedCentre, Long zoneId) {

        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new RuntimeException("Centre not found"));

        if (updatedCentre.getName() != null) {
            centre.setName(updatedCentre.getName());
        }

        if (updatedCentre.getCode() != null) {
            centre.setCode(updatedCentre.getCode());
        }

        if (updatedCentre.getRank() != null) {
            centre.setRank(updatedCentre.getRank());
        }

        if (zoneId != null) {
            Zone zone = zoneRepository.findById(zoneId)
                    .orElseThrow(() -> new RuntimeException("Zone not found"));
            centre.setZones(zone);
        }

        centreRepository.save(centre);
        return "Centre updated successfully";
    }


    private String generateCentreCode(String centreName, Long zoneId) {
        String prefix = "CTR";
        String namePart = centreName.replaceAll("[^A-Z0-9]", "").toUpperCase();
        if (namePart.length() > 5) {
            namePart = namePart.substring(0, 5);
        }

        // Get next number
        Long count = centreRepository.count();
        String numberPart = String.format("%03d", count + 1); // 001, 002, etc.

        return prefix + "-" + numberPart;
        // Example: CTR-001, CTR-002
        // You can customize this: include zone code, etc.
    }
}
