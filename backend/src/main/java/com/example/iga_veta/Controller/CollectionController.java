package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.CollectionRepository;
import com.example.iga_veta.Service.CollectionService;
import com.opencsv.CSVReader;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/collections")
public class CollectionController {

    @Autowired
    private CollectionService collectionDataService;

    @Autowired
    private CollectionRepository collectionRepository;


    @PostMapping("/storeCollection")
    public String storeCollection() {
        collectionDataService.fetchDataFromApi();
        return "Collections fetched and stored successfully!";
    }

    @GetMapping("/get")
    public List<Collections> getCollections(){
        return collectionDataService.findAll();
    }

    @GetMapping("/getByDate")
    public ResponseEntity<List<Collections>> getCollections(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Collections> collections = collectionRepository.findByDateBetween(fromDate.atStartOfDay(), toDate.atTime(23, 59, 59));
        return ResponseEntity.ok(collections);
    }

    @GetMapping("/get-all")
    public Map<String, Object> getCollectionsByDTO() {
        List<Collections> collections = collectionDataService.findAllData();
        return Map.of(
                "count", collections.size(),
                "data", collections
        );
    }

    @GetMapping("/get-by-centre/{name}")
    public ResponseEntity<List<Collections>> getByCentreName(@PathVariable("name") String name) {
        return ResponseEntity.ok( collectionDataService.findAllByCentre_Name(name));
    }

    @GetMapping("/by-gfs_code/{code}")
    public ResponseEntity<List<Collections>> getByGfsCode(@PathVariable("code") String code) {
        return ResponseEntity.ok( collectionDataService.findAllByGfsCode_Name(code));
    }

    @GetMapping("/totalAmount-by-gfs_code/{code}")
    public ResponseEntity<BigDecimal> getTotalAmountByGfsCode(@PathVariable("code") String code) {
        return ResponseEntity.ok( collectionDataService.findTotalAmountByGfsCode_Name(code));
    }


    @PostMapping("/totalAmount-by-centreAnd-gfs_code")
    public ResponseEntity<BigDecimal> getTotalAmountByCentreAndGfsCode(@RequestBody Map<String, String> body) {


        String code = body.get("gfs_code");
        String centre_name = body.get("centre_name");

        return ResponseEntity.ok( collectionDataService.getTotalAmountByCentreAndGfsCode(centre_name, code));
    }


}



