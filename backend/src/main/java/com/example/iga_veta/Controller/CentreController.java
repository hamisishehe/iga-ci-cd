package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Zone;
import com.example.iga_veta.Repository.CentreRepository;
import com.example.iga_veta.Service.CentreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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



}
