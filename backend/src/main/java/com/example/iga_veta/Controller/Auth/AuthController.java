package com.example.iga_veta.Controller.Auth;

import com.example.iga_veta.Model.User;
import com.example.iga_veta.Service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {


    @Autowired
    private  AuthService authService;

    @PostMapping("/login")
    public Map<String, String> loginUser(@RequestBody Map<String, String> loginDetails,
                                         HttpServletRequest request) {

        System.out.println("====================================================");
        System.out.println(loginDetails);
        System.out.println("====================================================");

        String email = loginDetails.get("email");
        String password = loginDetails.get("password");

        return authService.login(email, password, request);
    }

}
