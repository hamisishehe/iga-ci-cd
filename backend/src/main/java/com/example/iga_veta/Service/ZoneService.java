package com.example.iga_veta.Service;


import com.example.iga_veta.Model.Zone;
import com.example.iga_veta.Repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ZoneService {

    @Autowired
    private ZoneRepository zoneRepository;

    public Zone saveZones(String name,String zoneCode) {
        Zone zone = new Zone();
        zone.setName(name);
        zone.setCode(zoneCode);
        return zoneRepository.save(zone);
    }

    public List<Zone> getAllZones() {
        return zoneRepository.findAll();
    }
    public Zone findZoneById(Long id) {
        return  zoneRepository.findById(id).orElse(null);
    }

    public Zone findZoneByName(String name) {
        return zoneRepository.findOneByName(name).orElse(null);
    }

    public String updateZone(Zone zone) {
        Zone zone1 = zoneRepository.findById(zone.getId()).orElse(null);

        if (zone1 != null) {
            if (zone.getName() != null && !zone.getName().isEmpty()) {
                zone1.setName(zone.getName());
            }
            if (zone.getCode() != null && !zone.getCode().isEmpty()) {
                zone1.setCode(zone.getCode());
            }
            zoneRepository.save(zone1);
            return "Zone updated";
        }

        return "Zone not found";
    }

    public String deleteZone(Long  zoneId) {
        Zone zone1 = zoneRepository.findById(zoneId).orElse(null);
        if (zone1 != null) {
            zoneRepository.delete(zone1);
            return "Zone deleted";
        }
        return "Zone not found";
    }
}
