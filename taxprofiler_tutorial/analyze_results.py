#!/usr/bin/env python3
"""
Analyze and compare results from Kraken2, Centrifuge, and Kaiju
Usage: python analyze_results.py --results_dir results
"""

import argparse
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import sys

def load_taxpasta_profiles(taxpasta_file):
    """Load standardized TAXPASTA profiles"""
    try:
        df = pd.read_csv(taxpasta_file, sep='\t')
        return df
    except FileNotFoundError:
        print(f"Error: Could not find {taxpasta_file}")
        return None

def calculate_classification_rates(results_dir):
    """Calculate classification rates for each tool"""
    print("\n" + "="*60)
    print("CLASSIFICATION RATES")
    print("="*60)

    # This would need to parse tool-specific outputs
    # Placeholder for demonstration
    tools = ['kraken2', 'centrifuge', 'kaiju']
    rates = {}

    for tool in tools:
        tool_dir = Path(results_dir) / tool
        if tool_dir.exists():
            print(f"{tool.upper()}: Check {tool_dir} for classification statistics")

    return rates

def compare_top_taxa(df, top_n=10):
    """Compare top N taxa across all tools"""
    print("\n" + "="*60)
    print(f"TOP {top_n} TAXA COMPARISON")
    print("="*60)

    # Get top taxa by total abundance across all tools
    top_taxa = df.groupby('taxonomy_name')['count'].sum().nlargest(top_n)

    print("\nTop taxa by total abundance:")
    for i, (taxon, count) in enumerate(top_taxa.items(), 1):
        print(f"{i:2d}. {taxon:40s} : {count:10.0f} reads")

    # Create comparison table
    comparison = df[df['taxonomy_name'].isin(top_taxa.index)]
    pivot = comparison.pivot_table(
        index='taxonomy_name',
        columns='tool',
        values='count',
        fill_value=0
    )

    print("\nAbundance comparison across tools:")
    print(pivot.to_string())

    return pivot

def analyze_agreement(df):
    """Analyze agreement between tools"""
    print("\n" + "="*60)
    print("TOOL AGREEMENT ANALYSIS")
    print("="*60)

    # Get unique taxa identified by each tool
    tools = df['tool'].unique()

    for tool in tools:
        tool_taxa = set(df[df['tool'] == tool]['taxonomy_name'].unique())
        print(f"\n{tool.upper()}: {len(tool_taxa)} unique taxa")

    # Find taxa identified by all tools
    all_tools_taxa = set(df['taxonomy_name'].unique())
    taxa_by_tool = {}

    for tool in tools:
        taxa_by_tool[tool] = set(df[df['tool'] == tool]['taxonomy_name'].unique())

    # Taxa found by all tools
    common_taxa = set.intersection(*taxa_by_tool.values())
    print(f"\nTaxa identified by ALL tools: {len(common_taxa)}")

    # Taxa unique to each tool
    for tool in tools:
        unique = taxa_by_tool[tool] - set.union(*[taxa_by_tool[t] for t in tools if t != tool])
        print(f"Taxa unique to {tool.upper()}: {len(unique)}")
        if len(unique) > 0 and len(unique) <= 5:
            print(f"  Examples: {', '.join(list(unique)[:5])}")

def plot_comparison(pivot, output_file='tool_comparison_heatmap.png'):
    """Create visualization comparing tools"""
    plt.figure(figsize=(12, 8))
    sns.heatmap(
        pivot,
        annot=True,
        fmt='.0f',
        cmap='YlOrRd',
        cbar_kws={'label': 'Read count'}
    )
    plt.title('Top Taxa: Tool Comparison', fontsize=16, fontweight='bold')
    plt.xlabel('Tool', fontsize=12)
    plt.ylabel('Taxon', fontsize=12)
    plt.tight_layout()
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"\nHeatmap saved to: {output_file}")

def plot_tool_specificity(df, output_file='tool_specificity.png'):
    """Plot number of taxa identified by each tool"""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Number of taxa per tool
    taxa_counts = df.groupby('tool')['taxonomy_name'].nunique()
    axes[0].bar(taxa_counts.index, taxa_counts.values, color=['#1f77b4', '#ff7f0e', '#2ca02c'])
    axes[0].set_ylabel('Number of Unique Taxa', fontsize=12)
    axes[0].set_title('Taxa Identified by Each Tool', fontsize=14, fontweight='bold')
    axes[0].tick_params(axis='x', rotation=45)

    # Total reads classified per tool
    read_counts = df.groupby('tool')['count'].sum()
    axes[1].bar(read_counts.index, read_counts.values, color=['#1f77b4', '#ff7f0e', '#2ca02c'])
    axes[1].set_ylabel('Total Classified Reads', fontsize=12)
    axes[1].set_title('Reads Classified by Each Tool', fontsize=14, fontweight='bold')
    axes[1].tick_params(axis='x', rotation=45)

    plt.tight_layout()
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"Specificity plot saved to: {output_file}")

def generate_summary_report(df, output_file='analysis_summary.txt'):
    """Generate a text summary report"""
    with open(output_file, 'w') as f:
        f.write("="*80 + "\n")
        f.write("TAXPROFILER ANALYSIS SUMMARY\n")
        f.write("Comparison of Kraken2, Centrifuge, and Kaiju\n")
        f.write("="*80 + "\n\n")

        # Overall statistics
        f.write("OVERALL STATISTICS\n")
        f.write("-"*80 + "\n")
        tools = df['tool'].unique()
        for tool in tools:
            tool_df = df[df['tool'] == tool]
            n_taxa = tool_df['taxonomy_name'].nunique()
            n_reads = tool_df['count'].sum()
            f.write(f"{tool.upper():15s}: {n_taxa:6d} taxa, {n_reads:12.0f} reads classified\n")

        f.write("\n\nTOP 10 TAXA (by total abundance)\n")
        f.write("-"*80 + "\n")
        top_taxa = df.groupby('taxonomy_name')['count'].sum().nlargest(10)
        for i, (taxon, count) in enumerate(top_taxa.items(), 1):
            f.write(f"{i:2d}. {taxon:50s} {count:12.0f} reads\n")

        f.write("\n\nAGREEMENT ANALYSIS\n")
        f.write("-"*80 + "\n")
        taxa_by_tool = {}
        for tool in tools:
            taxa_by_tool[tool] = set(df[df['tool'] == tool]['taxonomy_name'].unique())

        common_taxa = set.intersection(*taxa_by_tool.values())
        f.write(f"Taxa identified by ALL tools: {len(common_taxa)}\n\n")

        for tool in tools:
            unique = taxa_by_tool[tool] - set.union(*[taxa_by_tool[t] for t in tools if t != tool])
            f.write(f"Taxa unique to {tool.upper()}: {len(unique)}\n")

    print(f"\nSummary report saved to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Analyze taxprofiler results')
    parser.add_argument('--results_dir', default='results',
                        help='Path to results directory')
    parser.add_argument('--top_n', type=int, default=10,
                        help='Number of top taxa to compare')
    parser.add_argument('--output_prefix', default='analysis',
                        help='Prefix for output files')

    args = parser.parse_args()

    # Find TAXPASTA file
    taxpasta_file = Path(args.results_dir) / 'taxpasta' / 'taxpasta_standardised_profiles.tsv'

    if not taxpasta_file.exists():
        print(f"Error: Could not find TAXPASTA file at {taxpasta_file}")
        print("\nMake sure the pipeline has completed and results are in the specified directory.")
        sys.exit(1)

    print("="*80)
    print("TAXPROFILER RESULTS ANALYSIS")
    print("="*80)
    print(f"\nLoading data from: {taxpasta_file}")

    # Load data
    df = load_taxpasta_profiles(taxpasta_file)
    if df is None:
        sys.exit(1)

    print(f"Loaded {len(df)} taxonomic assignments")
    print(f"Tools analyzed: {', '.join(df['tool'].unique())}")

    # Run analyses
    pivot = compare_top_taxa(df, args.top_n)
    analyze_agreement(df)

    # Generate visualizations
    plot_comparison(pivot, f'{args.output_prefix}_heatmap.png')
    plot_tool_specificity(df, f'{args.output_prefix}_specificity.png')

    # Generate summary report
    generate_summary_report(df, f'{args.output_prefix}_summary.txt')

    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80)
    print("\nGenerated files:")
    print(f"  - {args.output_prefix}_heatmap.png")
    print(f"  - {args.output_prefix}_specificity.png")
    print(f"  - {args.output_prefix}_summary.txt")
    print("\nReview these files for your report!")

if __name__ == '__main__':
    main()
