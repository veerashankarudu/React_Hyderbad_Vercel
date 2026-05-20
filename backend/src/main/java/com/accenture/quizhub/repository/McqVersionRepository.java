package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.McqVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface McqVersionRepository extends JpaRepository<McqVersion, Long> {

    List<McqVersion> findByMcqIdOrderByVersionNumberDesc(Long mcqId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM McqVersion v WHERE v.mcqId = :mcqId")
    Integer findMaxVersionByMcqId(@Param("mcqId") Long mcqId);
}
