package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.LoginAttempt;
import com.example.iga_veta.Service.LoginAttemptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/login_attempts")

public class LoginAttemptController {


    @Autowired
    public LoginAttemptService loginAttemptService;


    @GetMapping("/get_all")
    public List<LoginAttempt>  getAll(){

        return loginAttemptService.getAll();

    }
}
