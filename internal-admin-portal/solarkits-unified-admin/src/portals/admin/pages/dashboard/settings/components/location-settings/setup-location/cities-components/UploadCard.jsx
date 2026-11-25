import { FaFileExcel, FaInfoCircle, FaSpinner, FaUpload, FaClock } from "react-icons/fa";
import CustomFilePicker from "@/components/CustomFilePicker";

export default function UploadCard({
    boundaryFetched,
    handleFile,
    excelData
}) {
    return (
        <div className="card hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-5">
                {/* Last updated badge */}
                <div className="flex justify-end mb-4">
                    <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                        <FaClock size={10} />
                        Upload cities
                    </span>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                            <FaFileExcel className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary">Upload Excel File</h3>
                            <p className="text-text-secondary text-sm">Upload Excel file containing cities data</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200">
                        {excelData.length} cities ready
                    </div>
                </div>

                <div className="space-y-4">
                    {!boundaryFetched && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                            <FaSpinner className="animate-spin text-amber-500" />
                            <span className="text-sm text-amber-700">Loading district boundary...</span>
                        </div>
                    )}
                    
                    <CustomFilePicker
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFile}
                        icon={<FaUpload className="mr-2" />}
                        label="Choose Excel File"
                        className="w-full"
                        disabled={!boundaryFetched}
                    />

                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-start gap-2">
                        <FaInfoCircle className="text-primary mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <span className="font-medium text-primary">Required columns:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <code className="px-2 py-1 bg-white border border-border rounded text-xs font-mono text-primary">city_name</code>
                                <code className="px-2 py-1 bg-white border border-border rounded text-xs font-mono text-primary">lat</code>
                                <code className="px-2 py-1 bg-white border border-border rounded text-xs font-mono text-primary">lng</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}