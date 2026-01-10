package com.example.iga_veta.Service;


import com.example.iga_veta.Model.LoginAttempt;
import com.example.iga_veta.Repository.LoginAttemptRepository;
import com.example.iga_veta.Repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LoginAttemptService {


    @Autowired
    private LoginAttemptRepository loginAttemptRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final HttpServletRequest request;

    public LoginAttemptService(HttpServletRequest request) {
        this.request = request;
    }

    public List<LoginAttempt> getAll(){
        return loginAttemptRepository.findAll();
    }

    public void logAttempt(String username, LoginAttempt.Status status) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setStatus(status);
        attempt.setIpAddress(getClientIP(request));
        loginAttemptRepository.save(attempt);
    }

    public String getClientIP(HttpServletRequest request) {

        System.out.println("X-Forwarded-For: " + request.getHeader("X-Forwarded-For"));
        System.out.println("Proxy-Client-IP: " + request.getHeader("Proxy-Client-IP"));
        System.out.println("WL-Proxy-Client-IP: " + request.getHeader("WL-Proxy-Client-IP"));
        System.out.println("HTTP_CLIENT_IP: " + request.getHeader("HTTP_CLIENT_IP"));
        System.out.println("HTTP_X_FORWARDED_FOR: " + request.getHeader("HTTP_X_FORWARDED_FOR"));
        System.out.println("RemoteAddr: " + request.getRemoteAddr());


        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            // In case of multiple IPs, take the first one
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("Proxy-Client-IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        ip = request.getHeader("WL-Proxy-Client-IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        ip = request.getHeader("HTTP_CLIENT_IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
