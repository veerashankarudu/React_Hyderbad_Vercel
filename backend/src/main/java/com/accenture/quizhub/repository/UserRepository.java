package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEnterpriseId(String enterpriseId);
    Optional<User> findByEmail(String email);
    boolean existsByEnterpriseId(String enterpriseId);
    List<User> findByRole(Role role);
    List<User> findByTechStacksId(Long techStackId);
}
