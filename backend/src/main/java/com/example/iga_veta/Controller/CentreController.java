package com.example.iga_veta.Controller;


import com.example.iga_veta.DTO.CentreDTO;
import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Zone;
import com.example.iga_veta.Repository.CentreRepository;
import com.example.iga_veta.Service.CentreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/centre")
public class CentreController {

    @Autowired
    private CentreService centreService;

    @GetMapping("/get")
    public List<Centre> getAll(){
        return centreService.getCentres();
    }


    @GetMapping("/byName")
    public Centre centreByName(@RequestParam String name){
        return centreService.getCentreByName(name);
    }



    @PutMapping("/update/{id}")
    public ResponseEntity<String> updateCentre(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        Centre centre = new Centre();
        centre.setName((String) payload.get("name"));
        centre.setRank(Centre.Rank.valueOf((String) payload.get("rank")));
        centre.setCode((String) payload.get("code"));

        Long zoneId = payload.get("zone_id") != null
                ? Long.valueOf(payload.get("zone_id").toString())
                : null;

        String response = centreService.updateCentre(id, centre, zoneId);
        return ResponseEntity.ok(response);
    }





}
