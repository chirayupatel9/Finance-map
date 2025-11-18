# Tutorial 8: Kraken2 vs Centrifuge vs Kaiju (ADVANCED)

## Overview

This tutorial demonstrates how to use nf-core/taxprofiler to compare three popular taxonomic profiling tools on metagenomic sequencing data:

- **Kraken2**: Fast k-mer-based taxonomic classifier
- **Centrifuge**: Memory-efficient classifier using FM-index
- **Kaiju**: Protein-level classifier for sensitive detection

## Data

- **Input file**: `evol1.sorted.unmapped.R1.fastq`
- **Location**: `/ifs/groups/eces450650Grp/data/mappings/`
- **Type**: Single-end unmapped reads (likely from host removal)

## What is nf-core/taxprofiler?

nf-core/taxprofiler is a bioinformatics pipeline that:
- Runs multiple taxonomic profilers in parallel
- Standardizes outputs for easy comparison
- Generates interactive visualizations (Krona charts)
- Provides comprehensive QC reports (MultiQC)

### Why Compare Multiple Tools?

Different profilers have different strengths:

| Tool | Method | Speed | Sensitivity | Memory | Best For |
|------|--------|-------|-------------|---------|----------|
| **Kraken2** | k-mer matching (DNA) | Very Fast | Good | High | Quick profiling, abundant species |
| **Centrifuge** | FM-index (DNA) | Fast | Good | Low | Large databases, resource-limited |
| **Kaiju** | BWT (Protein) | Moderate | High | Moderate | Divergent species, viral detection |

## Directory Structure

```
taxprofiler_tutorial/
├── samplesheet.csv          # Sample information
├── database.csv             # Database paths for each tool
├── nextflow.config          # Pipeline configuration
├── run_taxprofiler.sh       # Execution script
└── README.md               # This file
```

## Prerequisites

### 1. Software Installation

On your HPC cluster, ensure you have:

```bash
# Load modules (adjust for your system)
module load nextflow/23.10.0
module load singularity/3.8.0  # or docker
module load java/11
```

Or install Nextflow:
```bash
curl -s https://get.nextflow.io | bash
mv nextflow ~/bin/  # or another directory in your PATH
```

### 2. Database Setup

You need to download and prepare databases for each tool. Here are recommended options:

#### Kraken2 Database

```bash
# Option 1: Download pre-built standard database (~48GB)
mkdir -p databases/kraken2
cd databases/kraken2
wget https://genome-idx.s3.amazonaws.com/kraken/k2_standard_20231009.tar.gz
tar -xzvf k2_standard_20231009.tar.gz

# Option 2: Build custom database
kraken2-build --download-taxonomy --db standard_db
kraken2-build --download-library bacteria --db standard_db
kraken2-build --download-library viral --db standard_db
kraken2-build --build --db standard_db
```

#### Centrifuge Database

```bash
# Download pre-built bacteria database (~4GB)
mkdir -p databases/centrifuge
cd databases/centrifuge
wget https://genome-idx.s3.amazonaws.com/centrifuge/p_compressed%2Bh%2Bv.tar.gz
tar -xzvf p_compressed+h+v.tar.gz
```

#### Kaiju Database

```bash
# Download and build RefSeq database
mkdir -p databases/kaiju
cd databases/kaiju
kaiju-makedb -s refseq

# This creates:
# - kaiju_db_refseq.fmi (index file)
# - nodes.dmp (taxonomy)
# - names.dmp (taxonomy names)
```

### 3. Update Database Paths

Edit `database.csv` with your actual database paths:

```csv
tool,db_name,db_params,db_path
kraken2,kraken2-standard,--quick,/full/path/to/kraken2/database
centrifuge,centrifuge-bacteria,,/full/path/to/centrifuge/database/p_compressed+h+v
kaiju,kaiju-refseq,-a greedy -e 3,/full/path/to/kaiju/database
```

**Important notes:**
- For Kraken2: Path should contain `hash.k2d`, `opts.k2d`, `taxo.k2d` files
- For Centrifuge: Path should be the prefix (e.g., `/path/to/p_compressed+h+v`)
- For Kaiju: Path should contain `kaiju_db_*.fmi`, `nodes.dmp`, `names.dmp`

## Running the Analysis

### Step 1: Verify Input File

```bash
# Check that the data file exists and has reads
ls -lh /ifs/groups/eces450650Grp/data/mappings/evol1.sorted.unmapped.R1.fastq
head -n 4 /ifs/groups/eces450650Grp/data/mappings/evol1.sorted.unmapped.R1.fastq
```

### Step 2: Verify Samplesheet

The `samplesheet.csv` should look like:
```csv
sample,run_accession,instrument_platform,fastq_1,fastq_2,fasta
evol1,run1,ILLUMINA,/ifs/groups/eces450650Grp/data/mappings/evol1.sorted.unmapped.R1.fastq,,
```

### Step 3: Test Pipeline Setup

```bash
# Dry run to check configuration
nextflow run nf-core/taxprofiler \
    -r 1.1.8 \
    -profile test,singularity \
    --outdir test_results
```

### Step 4: Run the Full Analysis

```bash
# Option 1: Submit as SLURM job
sbatch run_taxprofiler.sh

# Option 2: Run directly
bash run_taxprofiler.sh

# Option 3: Run interactively with custom settings
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
    --run_profile_standardisation \
    --run_krona \
    -resume
```

### Step 5: Monitor Progress

```bash
# Check SLURM job status
squeue -u $USER

# Monitor Nextflow execution
tail -f taxprofiler_*.log

# Check running processes
ls -lht work/
```

## Understanding the Results

### Output Directory Structure

```
results/
├── kraken2/                    # Kraken2 raw outputs
│   ├── evol1.kraken2.report.txt
│   └── evol1.classified.fastq.gz
├── centrifuge/                 # Centrifuge raw outputs
│   ├── evol1.centrifuge.txt
│   └── evol1.centrifuge.report.txt
├── kaiju/                      # Kaiju raw outputs
│   ├── evol1.kaiju.txt
│   └── evol1.kaiju.summary.txt
├── taxpasta/                   # ⭐ Standardized comparison tables
│   ├── taxpasta_standardised_profiles.tsv
│   └── taxpasta_merged_profiles.tsv
├── krona/                      # ⭐ Interactive visualizations
│   ├── evol1_kraken2.html
│   ├── evol1_centrifuge.html
│   └── evol1_kaiju.html
├── multiqc/                    # ⭐ Comprehensive QC report
│   └── multiqc_report.html
└── pipeline_info/              # Execution statistics
    ├── execution_report.html
    └── execution_timeline.html
```

### Key Files to Review

#### 1. MultiQC Report (`multiqc/multiqc_report.html`)
- **What**: Comprehensive quality control report
- **Contains**: Read statistics, classification rates, tool comparisons
- **How to use**: Open in web browser to see overall performance

#### 2. TAXPASTA Standardized Profiles (`taxpasta/`)
- **What**: Unified taxonomic profiles across all tools
- **Format**: Tab-separated table with taxonomy IDs and abundances
- **How to use**: Import into R/Python for statistical comparison

```r
# Example R code to compare results
library(tidyverse)

profiles <- read_tsv("results/taxpasta/taxpasta_standardised_profiles.tsv")

# Compare abundances between tools
profiles %>%
    group_by(taxonomy_id, tool) %>%
    summarize(abundance = sum(count)) %>%
    pivot_wider(names_from = tool, values_from = abundance)
```

#### 3. Krona Charts (`krona/*.html`)
- **What**: Interactive hierarchical visualizations
- **Contains**: Taxonomic tree with abundance proportions
- **How to use**: Open in web browser, click to zoom into different taxa

#### 4. Tool-Specific Outputs

**Kraken2 Report** (`kraken2/*.report.txt`):
```
  %     reads   reads_assigned   rank    taxid   name
50.00   10000   5000            U       0       unclassified
50.00   10000   500             D       2       Bacteria
30.00   6000    100             P       1224    Proteobacteria
```

**Centrifuge Report** (`centrifuge/*.report.txt`):
```
name                     taxID    taxRank    genomeSize    numReads    abundance
Escherichia coli         562      species    5000000       1500        0.15
Staphylococcus aureus    1280     species    2800000       800         0.08
```

**Kaiju Summary** (`kaiju/*.summary.txt`):
```
file    percent    reads    taxon_id    taxon_name
evol1   45.5       4550     562         Escherichia coli
evol1   12.3       1230     1280        Staphylococcus aureus
```

## Interpreting Results

### Comparison Metrics

1. **Classification Rate**: % of reads assigned to taxa
   - Kraken2: Usually highest (most permissive)
   - Centrifuge: Moderate
   - Kaiju: May be lower but more specific

2. **Taxonomic Resolution**: Depth of classification
   - Species-level assignments vs genus/family
   - Check the rank column in reports

3. **Agreement Between Tools**:
   - Taxa identified by all three tools = high confidence
   - Taxa unique to one tool = requires validation
   - Protein-level hits (Kaiju only) = divergent sequences

### Common Patterns

| Observation | Interpretation |
|-------------|----------------|
| High Kraken2, low others | Possible false positives, check database coverage |
| High Kaiju, low DNA tools | Divergent organisms, viral sequences |
| All tools agree | High confidence assignments |
| High unclassified % | Novel organisms, quality issues, or host contamination |

### Visualization Example

Create a comparison plot:

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load standardized profiles
df = pd.read_csv('results/taxpasta/taxpasta_standardised_profiles.tsv', sep='\t')

# Get top 10 species across all tools
top_species = df.groupby('taxonomy_name')['count'].sum().nlargest(10).index

# Compare abundances
comparison = df[df['taxonomy_name'].isin(top_species)]
pivot = comparison.pivot(index='taxonomy_name', columns='tool', values='count')

# Plot heatmap
plt.figure(figsize=(12, 8))
sns.heatmap(pivot, annot=True, fmt='.0f', cmap='YlOrRd')
plt.title('Top 10 Species: Tool Comparison')
plt.tight_layout()
plt.savefig('tool_comparison_heatmap.png', dpi=300)
```

## Expected Runtime

| Step | Time (estimate) | Notes |
|------|----------------|-------|
| Pipeline setup | 5-10 min | Downloading containers |
| Kraken2 | 5-15 min | Fastest profiler |
| Centrifuge | 10-30 min | Moderate speed |
| Kaiju | 30-60 min | Slowest (protein-level) |
| Post-processing | 5-10 min | TAXPASTA, Krona |
| **Total** | **1-2 hours** | Depends on data size and resources |

## Troubleshooting

### Common Issues

#### 1. Database Not Found
```
Error: Kraken2 database does not contain necessary files
```
**Solution**: Verify database.csv paths are absolute and files exist

#### 2. Memory Errors
```
Error: Process exceeded available memory
```
**Solution**: Increase memory in nextflow.config or use smaller databases

#### 3. Container Issues
```
Error: Unable to pull container image
```
**Solution**: Check Singularity cache directory permissions
```bash
mkdir -p $HOME/.singularity_cache
export SINGULARITY_CACHEDIR=$HOME/.singularity_cache
```

#### 4. Module Not Loaded
```
Error: command not found: nextflow
```
**Solution**: Load required modules or install Nextflow

### Getting Help

- **Pipeline documentation**: https://nf-core.re/taxprofiler/1.1.8/
- **Slack support**: nfcore.slack.com (#taxprofiler channel)
- **GitHub issues**: https://github.com/nf-core/taxprofiler/issues

## Deliverables for Extra Credit

To receive the 20% extra credit, include in your report:

1. **MultiQC Report**: Screenshot or PDF of key metrics
2. **Tool Comparison Table**:
   - Classification rates for each tool
   - Top 10 identified species with abundances
   - Agreement/disagreement analysis
3. **Krona Visualizations**: Screenshots from all three tools
4. **Written Analysis** (1-2 pages):
   - Which tool identified the most taxa?
   - Where do the tools agree/disagree?
   - What might explain differences?
   - Which tool would you trust most for this data? Why?
5. **Technical Details**:
   - Database versions used
   - Execution time and resource usage
   - Any challenges encountered

## Next Steps

After completing this tutorial, you can:

1. **Try different databases**: Test with viral, fungal, or custom databases
2. **Parameter optimization**: Adjust sensitivity/specificity tradeoffs
3. **Paired-end data**: If R2 file exists, add to samplesheet
4. **Functional profiling**: Add --run_motus or other profilers
5. **Comparative analysis**: Run on multiple samples to compare communities

## Additional Resources

- **Kraken2 manual**: https://github.com/DerrickWood/kraken2/wiki
- **Centrifuge manual**: https://ccb.jhu.edu/software/centrifuge/manual.shtml
- **Kaiju manual**: https://github.com/bioinformatics-centre/kaiju
- **nf-core tutorial**: https://nf-co.re/taxprofiler/1.1.8/docs/usage/tutorials
- **Taxonomic profiling review**: https://doi.org/10.1186/s13059-019-1922-1

---

**Good luck with your analysis!** 🧬

This is an advanced tutorial that will give you hands-on experience with:
- Nextflow workflow management
- Container-based bioinformatics
- Comparative metagenomic analysis
- Data interpretation and validation
