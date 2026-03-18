/**
 * Shared patch skeleton generator.
 * Can be used by both backend and CLI tooling.
 */
function generatePatchSkeleton(urls, targetDir) {
  return {
    patchFile: `${targetDir}/NSW_buy_nsw_refined.patch`,
    notesFile: `${targetDir}/NSW_buy_nsw_refined.patch.notes`,
    qaFile: `${targetDir}/NSW_buy_nsw_refined.patch.qa.md`,
    urls,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generatePatchSkeleton };
