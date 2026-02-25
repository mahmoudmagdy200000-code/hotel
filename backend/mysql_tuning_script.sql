-- MySQL Memory and High-Concurrency Performance Tuning for Nexa PMS
-- Optimized for 4GB RAM Cloud Server Environment
-- Apply these settings to your my.cnf / my.ini configuration file, or execute them directly via root.

[mysqld]
# 1. Surgical Memory Optimization (4GB RAM)
# Allocate 2GB (approx 50% of total RAM) to InnoDB Buffer Pool to strictly prevent OS swapping or OOM crashes
innodb_buffer_pool_size = 2G
# Split the pool into multiple instances to mitigate thread contention overhead during simultaneous 48-user operations
innodb_buffer_pool_instances = 2

# 2. Connection and Thread Allocation
# Prevent cascading memory exhaustion via runaway connections
max_connections = 120
thread_cache_size = 32

# Note: The composite DB Indices are managed directly by EF Core Migrations natively based on the Fluent API changes applied to ApplicationDbContext.
