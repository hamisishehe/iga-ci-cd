package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.Zone;
import com.example.iga_veta.Service.ZoneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zone")
public class ZoneController {

    @Autowired
    private ZoneService zoneService;



    @GetMapping("/get")
    public List<Zone> getAllZones(){
        return zoneService.getAllZones();
    }

//    @PostMapping("/save")
//    public Zone saveZone(@RequestParam String name, @RequestParam String code){
//        return zoneService.saveZones(name,code);
//    }
//
//    @GetMapping("/{id}")
//    public Zone getZone(@PathVariable Long id){
//        return zoneService.findZoneById(id);
//    }
//
//
//    @GetMapping("/byName")
//    public Zone getZoneByName(@RequestParam String name){
//        return zoneService.findZoneByName(name);
//    }
//
//
//    @DeleteMapping("/delete/{id}")
//    public void deleteZone(@PathVariable Long id){
//        zoneService.deleteZone(id);
//    }
//




}
