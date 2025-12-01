package com.example.iga_veta.Service;

import com.example.iga_veta.Model.AuditLog;
import com.example.iga_veta.Model.LoginAttempt;
import com.example.iga_veta.Model.User;
import com.example.iga_veta.Repository.AuditLogRepository;
import com.example.iga_veta.Repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private final JwtService jwtService;

    public AuthService(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public Map<String, String> login(String email, String password, HttpServletRequest httpRequest) {

        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            loginAttemptService.logAttempt(email, LoginAttempt.Status.FAILURE);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        User user = userOptional.get();

        if (!passwordEncoder.matches(password, user.getPassword())) {
            loginAttemptService.logAttempt(email, LoginAttempt.Status.FAILURE);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Login success
        loginAttemptService.logAttempt(email, LoginAttempt.Status.SUCCESS);

        AuditLog auditLog = new AuditLog();
        auditLog.setUsers(user);
        auditLog.setAction("User login");
        auditLog.setObjectType("User");
        auditLog.setObjectId(user.getId());
        auditLog.setUserAgent(httpRequest.getHeader("User-Agent"));
        auditLog.setIpAddress(getClientIP(httpRequest));
        auditLogRepository.save(auditLog);

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        response.put("role", user.getRole().name());
        response.put("userType", user.getUserType().name());
        response.put("centre", user.getCentres().getName());
        response.put("zone", user.getCentres().getZones().getName());
        response.put("username", user.getUserName());
        response.put("email", user.getEmail());
        response.put("userId",user.getId().toString() );

        return response;
    }

    private String getClientIP(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
