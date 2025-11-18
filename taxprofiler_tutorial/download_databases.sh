#!/bin/bash

# ==============================================================================
# Database Download Helper Script
# ==============================================================================
# This script helps you download and set up databases for Kraken2, Centrifuge,
# and Kaiju. Adjust paths and options as needed for your system.
# ==============================================================================

set -e

# Configuration
BASE_DIR="${HOME}/taxprofiler_databases"
mkdir -p "${BASE_DIR}"
cd "${BASE_DIR}"

echo "=========================================="
echo "Downloading Taxonomic Databases"
echo "Base directory: ${BASE_DIR}"
echo "=========================================="
echo

# ==============================================================================
# Kraken2 Database
# ==============================================================================
echo "1. Setting up Kraken2 database..."
echo

KRAKEN2_DIR="${BASE_DIR}/kraken2"
mkdir -p "${KRAKEN2_DIR}"

# Option A: Download pre-built standard database (~48GB, recommended)
echo "Downloading Kraken2 standard database (this may take a while)..."
cd "${KRAKEN2_DIR}"
wget -c https://genome-idx.s3.amazonaws.com/kraken/k2_standard_20231009.tar.gz
tar -xzvf k2_standard_20231009.tar.gz
echo "Kraken2 database ready at: ${KRAKEN2_DIR}"
echo

# Option B: Build custom database (uncomment if you prefer this)
# kraken2-build --download-taxonomy --db custom_db
# kraken2-build --download-library bacteria --db custom_db
# kraken2-build --download-library viral --db custom_db
# kraken2-build --build --db custom_db --threads 8

# ==============================================================================
# Centrifuge Database
# ==============================================================================
echo "2. Setting up Centrifuge database..."
echo

CENTRIFUGE_DIR="${BASE_DIR}/centrifuge"
mkdir -p "${CENTRIFUGE_DIR}"
cd "${CENTRIFUGE_DIR}"

# Download compressed bacteria+archaea+viral database (~4GB)
echo "Downloading Centrifuge p+h+v database..."
wget -c https://genome-idx.s3.amazonaws.com/centrifuge/p_compressed%2Bh%2Bv.tar.gz
tar -xzvf p_compressed+h+v.tar.gz
echo "Centrifuge database ready at: ${CENTRIFUGE_DIR}"
echo

# ==============================================================================
# Kaiju Database
# ==============================================================================
echo "3. Setting up Kaiju database..."
echo

KAIJU_DIR="${BASE_DIR}/kaiju"
mkdir -p "${KAIJU_DIR}"
cd "${KAIJU_DIR}"

# Download RefSeq database (recommended)
echo "Downloading and building Kaiju RefSeq database..."
kaiju-makedb -s refseq

# Alternative: Download pre-built database if kaiju-makedb fails
# wget https://kaiju.binf.ku.dk/database/kaiju_db_refseq_2023-05-26.tgz
# tar -xzvf kaiju_db_refseq_2023-05-26.tgz

echo "Kaiju database ready at: ${KAIJU_DIR}"
echo

# ==============================================================================
# Summary
# ==============================================================================
echo "=========================================="
echo "Database Download Complete!"
echo "=========================================="
echo
echo "Database locations:"
echo "  Kraken2:    ${KRAKEN2_DIR}"
echo "  Centrifuge: ${CENTRIFUGE_DIR}/p_compressed+h+v"
echo "  Kaiju:      ${KAIJU_DIR}"
echo
echo "Next steps:"
echo "  1. Update database.csv with these paths:"
echo
echo "tool,db_name,db_params,db_path"
echo "kraken2,kraken2-standard,--quick,${KRAKEN2_DIR}"
echo "centrifuge,centrifuge-bacteria,,${CENTRIFUGE_DIR}/p_compressed+h+v"
echo "kaiju,kaiju-refseq,-a greedy -e 3,${KAIJU_DIR}"
echo
echo "  2. Run the pipeline: bash run_taxprofiler.sh"
echo

# Create a database.csv with the correct paths
cat > "${BASE_DIR}/../database.csv" << EOF
tool,db_name,db_params,db_path
kraken2,kraken2-standard,--quick,${KRAKEN2_DIR}
centrifuge,centrifuge-bacteria,,${CENTRIFUGE_DIR}/p_compressed+h+v
kaiju,kaiju-refseq,-a greedy -e 3,${KAIJU_DIR}
EOF

echo "Created database.csv with the correct paths!"
echo "Location: ${BASE_DIR}/../database.csv"
