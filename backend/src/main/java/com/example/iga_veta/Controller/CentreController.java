package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Service.CentreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/centre")
public class CentreController {

    @Autowired
    private CentreService centreService;

    @Autowired
    private ApiUsageRepository apiUsageRepository;


    @PostMapping("/create")
    public ResponseEntity<String> createCentre(@RequestBody Map<String, Object> payload) {
        trackUsage("/create", "POST");

        System.out.println(payload);

        String name = (String) payload.get("name");
        String rankStr = (String) payload.get("rank");
        Long zoneId = payload.get("zone_id") != null
                ? Long.valueOf(payload.get("zone_id").toString())
                : null;


            Centre.Rank rank = Centre.Rank.valueOf(rankStr.toUpperCase());

            String response = centreService.createCentre(name, String.valueOf(rank),zoneId);

            System.out.println(response);

            return ResponseEntity.ok(response);

    }

    @GetMapping("/get")
    public List<Centre> getAll(){
        trackUsage("/get", "GET");
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
        trackUsage("/update", "POST");
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


    private void trackUsage(String endpoint, String method) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/api/centres" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }



}
