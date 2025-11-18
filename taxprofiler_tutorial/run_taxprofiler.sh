#!/bin/bash
#SBATCH --job-name=taxprofiler_tutorial
#SBATCH --account=eces450650
#SBATCH --time=48:00:00
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --output=taxprofiler_%j.log
#SBATCH --error=taxprofiler_%j.err

# ==============================================================================
# nf-core/taxprofiler Tutorial: Comparing Kraken2, Centrifuge, and Kaiju
# ==============================================================================
#
# This script runs the taxprofiler pipeline to compare three taxonomic
# profiling tools: Kraken2, Centrifuge, and Kaiju
#
# Usage:
#   1. Update the database paths in database.csv
#   2. Load necessary modules (Nextflow, Singularity/Docker)
#   3. Submit with: sbatch run_taxprofiler.sh
#      OR run directly: bash run_taxprofiler.sh
# ==============================================================================

# Exit on any error
set -e

echo "=========================================="
echo "nf-core/taxprofiler Tutorial"
echo "Comparing Kraken2, Centrifuge, and Kaiju"
echo "=========================================="
echo

# Load required modules (adjust for your HPC environment)
# Uncomment and modify as needed:
# module load nextflow/23.10.0
# module load singularity/3.8.0
# module load java/11

# Check if Nextflow is available
if ! command -v nextflow &> /dev/null; then
    echo "ERROR: Nextflow is not installed or not in PATH"
    echo "Please install Nextflow or load the appropriate module"
    exit 1
fi

# Check Nextflow version
echo "Nextflow version:"
nextflow -version
echo

# Set working directory
WORK_DIR="${PWD}"
echo "Working directory: ${WORK_DIR}"
echo

# Pipeline version
PIPELINE_VERSION="1.1.8"

# Run the pipeline
echo "Starting taxprofiler pipeline..."
echo

nextflow run nf-core/taxprofiler \
    -r ${PIPELINE_VERSION} \
    -profile slurm,singularity \
    -c nextflow.config \
    --input samplesheet.csv \
    --databases database.csv \
    --outdir results \
    --run_kraken2 \
    --run_centrifuge \
    --run_kaiju \
    --run_profile_standardisation \
    --run_krona \
    -resume \
    -with-report results/pipeline_info/execution_report.html \
    -with-timeline results/pipeline_info/execution_timeline.html \
    -with-trace results/pipeline_info/execution_trace.txt \
    -with-dag results/pipeline_info/pipeline_dag.svg

echo
echo "=========================================="
echo "Pipeline execution completed!"
echo "=========================================="
echo
echo "Results are in: ${WORK_DIR}/results"
echo
echo "Key output directories:"
echo "  - results/kraken2/        : Kraken2 results"
echo "  - results/centrifuge/     : Centrifuge results"
echo "  - results/kaiju/          : Kaiju results"
echo "  - results/taxpasta/       : Standardized comparison tables"
echo "  - results/krona/          : Interactive visualization plots"
echo "  - results/multiqc/        : MultiQC report comparing all tools"
echo
echo "Next steps:"
echo "  1. Review the MultiQC report for overall quality metrics"
echo "  2. Compare standardized profiles in results/taxpasta/"
echo "  3. Explore Krona plots for interactive visualization"
echo "  4. Analyze tool-specific outputs for detailed results"
