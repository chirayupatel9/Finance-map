# Quick Start Guide

This is a condensed version of the full tutorial. For complete details, see [README.md](README.md).

## Setup (One-time)

### 1. Install Nextflow

```bash
# On your HPC cluster
module load nextflow  # or
curl -s https://get.nextflow.io | bash
```

### 2. Download Databases

```bash
# Run the helper script (will take several hours)
bash download_databases.sh

# OR download manually and update database.csv with paths
```

### 3. Update Configuration

Edit `database.csv` with your actual database paths:
```csv
tool,db_name,db_params,db_path
kraken2,kraken2-standard,--quick,/your/path/to/kraken2_db
centrifuge,centrifuge-bacteria,,/your/path/to/centrifuge_db
kaiju,kaiju-refseq,-a greedy -e 3,/your/path/to/kaiju_db
```

## Run Analysis

### Option 1: Submit as SLURM Job (Recommended)

```bash
sbatch run_taxprofiler.sh
```

Monitor progress:
```bash
squeue -u $USER
tail -f taxprofiler_*.log
```

### Option 2: Interactive Run

```bash
# Load modules
module load nextflow singularity

# Run pipeline
nextflow run nf-core/taxprofiler \
    -r 1.1.8 \
    -profile slurm,singularity \
    -c nextflow.config \
    --input samplesheet.csv \
    --databases database.csv \
    --outdir results \
    --run_kraken2 \
    --run_centrifuge \
    --run_kaiju \
    -resume
```

## Analyze Results

After pipeline completes (~1-2 hours):

```bash
# Run analysis script
python analyze_results.py --results_dir results

# View key outputs
firefox results/multiqc/multiqc_report.html
firefox results/krona/evol1_kraken2.html
firefox results/krona/evol1_centrifuge.html
firefox results/krona/evol1_kaiju.html
```

## Key Output Files

```
results/
├── multiqc/multiqc_report.html          ← Overall QC report
├── taxpasta/taxpasta_*.tsv              ← Standardized comparison tables
├── krona/*.html                         ← Interactive visualizations
└── [kraken2|centrifuge|kaiju]/          ← Tool-specific results
```

## For Your Report

Include:
1. MultiQC report screenshot
2. Top 10 taxa table from all three tools
3. Krona chart screenshots
4. Analysis of agreement/disagreement
5. Interpretation of results

## Troubleshooting

**Database not found**: Check absolute paths in `database.csv`
**Memory error**: Increase memory in `nextflow.config`
**Module not found**: Load required modules or install software

## Resources

- Full tutorial: [README.md](README.md)
- nf-core docs: https://nf-co.re/taxprofiler/1.1.8/
- Questions? Check Slack or GitHub issues

---

**Estimated time**: 2-4 hours (including setup)
**Extra credit**: 20% for completion
