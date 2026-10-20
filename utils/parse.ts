const GRD_START_CONFIG: Record<string, number> = {
    ssc: 2001,
    hsc: 2003,
    jsc: 2010,
};

export interface RawSubjectDetail {
    SUB_CODE: string | number;
    SUB_NAME: string;
}

export interface RawStudentData {
    roll_no?: string;
    regno?: string;
    name?: string;
    fname?: string;
    mname?: string;
    board_name?: string;
    session?: string;
    stud_group?: string;
    stud_type?: string;
    stud_sex?: string;
    sex?: string | number;
    res_detail?: string;
    dob?: string;
    eiin?: string;
    inst_name?: string;
    t_name?: string;
    z_name?: string;
    tot_full?: string | number | null;
    conv_1000?: string | number | null;
    sub4th?: string | null;
    display_details?: string;
    log_display_details?: string;
    display_details_ca?: string;
    log_display_details_ca?: string;
}

export interface RawBoardResponse {
    status: number;
    msg?: string;
    res?: RawStudentData;
    sfile?: string;
    sub_codes?: string[];
    sub_details?: RawSubjectDetail[];
    showmarks?: number;
    totalonly?: number;
    hidefailed?: number;
    notice?: string;
}

export interface PaperMarks {
    paperCode: string;
    paperName: string | null;
    theory: string | null;
    practical: string | null;
    mcq: string | null;
}

export interface SubjectEntry {
    rawCode: string;
    codes: string[];
    name: string | null;
    names: string[];
    grade: string | null;
    total: string | null;
    papers: PaperMarks[] | null;
    log: {
        previousTotal: string | null;
        previousGrade: string | null;
        totalChanged: boolean;
        gradeChanged: boolean;
        isChanged: boolean;
    } | null;
}

export interface AssessmentTable {
    title: string;
    valueColumnTitle: "Grade" | "Marks" | "Grade/Marks";
    showMarks: boolean;
    totalOnly: boolean;
    hasLog: boolean;
    subjects: SubjectEntry[];
}

export function parse_stud_result(
    resp: RawBoardResponse,
    exam?: string,
    year?: string | number,
) {
    if (resp.status !== 0 || !resp.res) {
        throw new Error(resp.msg || "Invalid student result response");
    }

    const res = resp.res;
    const examKey = String(exam ?? "").trim().toLowerCase();
    const examYear = Number(year);

    // 1. Gender normalization (matches original switch on charAt(0))
    let gender = res.stud_sex;
    if (typeof gender === "undefined") {
        if (typeof res.sex === "undefined") {
            gender = "N/A";
        } else {
            const firstChar = String(res.sex).charAt(0).toUpperCase();
            if (firstChar === "0" || firstChar === "M") gender = "Male";
            else if (firstChar === "1" || firstChar === "F") gender = "Female";
            else gender = "N/A";
        }
    }

    // 2. Subject dictionary (from resp.sub_details)
    const subMap: Record<string, string> = {};
    if (Array.isArray(resp.sub_details)) {
        for (const item of resp.sub_details) {
            if (item && item.SUB_CODE !== undefined) {
                subMap[String(item.SUB_CODE).trim()] = item.SUB_NAME.trim();
            }
        }
    }

    // 3. Determine Grade vs Marks column type (grd_start_config logic)
    let valueColumnTitle: "Grade" | "Marks" | "Grade/Marks" = "Grade/Marks";
    if (examKey in GRD_START_CONFIG && !Number.isNaN(examYear)) {
        valueColumnTitle =
            examYear >= GRD_START_CONFIG[examKey]! ? "Grade" : "Marks";
    }

    // 4. Helper to parse `mrks_dtls=total=grade` or `total=grade` or `grade`
    const parseRightSide = (rawResult: string, hideFailed: boolean) => {
        const split = rawResult.split("=");
        const count = split.length;
        const grade = (split[count - 1] ?? "").trim();

        let mrksDtls = "";
        let total = "";

        if (count > 2) {
            mrksDtls = (split[0] ?? "").trim();
            total = (split[1] ?? "").trim();
        } else if (count > 1) {
            mrksDtls = "";
            total = (split[0] ?? "").trim();
        }

        if (hideFailed && grade === "F") {
            mrksDtls = "";
            total = "";
        }

        return { mrksDtls, total, grade };
    };

    // 5. Parse assessment sections (Main & Continuous Assessment)
    const parseSection = (
        title: string,
        displayDetails?: string,
        logDisplayDetails?: string,
    ): AssessmentTable | null => {
        if (!displayDetails) return null;

        const marks = displayDetails.split(",");
        const logMarks = logDisplayDetails ? logDisplayDetails.split(",") : [];

        const haveMarks = marks.length >= 1 && marks[0]!.split(":").length > 1;
        if (!haveMarks) return null;

        const haveLogMarks =
            logMarks.length >= 1 && logMarks[0]!.split(":").length > 1;
        const haveMarksDetails =
            marks.length >= 1 && marks[0]!.split("=").length > 1;

        // Original script forces totalonly = 1 when log_marks exist
        const totalOnly = resp.totalonly === 1 || haveLogMarks;
        const showMarks = resp.showmarks === 1 && haveMarksDetails;
        const hideFailed = resp.hidefailed === 1;

        // Build log_map for re-scrutiny comparison
        const logMap: Record<string, { total: string; grade: string }> = {};
        if (haveLogMarks) {
            for (const item of logMarks) {
                const split = item.split(":");
                if (split.length === 1) continue;
                const logCode = split[0]!.trim();
                if (!logCode) continue;

                const parsedLog = parseRightSide(split[1]!, hideFailed);
                logMap[logCode] = {
                    total: parsedLog.total,
                    grade: parsedLog.grade,
                };
            }
        }

        const subjects: SubjectEntry[] = [];

        for (const item of marks) {
            const mrksSplit = item.split(":");
            if (mrksSplit.length === 1) continue;

            const code = mrksSplit[0]!.trim();
            if (!code) continue;

            const { mrksDtls, total, grade } = parseRightSide(
                mrksSplit[1]!,
                hideFailed,
            );

            // Split combined subject codes (e.g. "101+102" or "101-102")
            const codeSplit = code
                .split(/[\+\-]/)
                .map((c) => c.trim())
                .filter(Boolean);

            const resolvedNames = codeSplit
                .map((c) => subMap[c])
                .filter((n): n is string => Boolean(n));

            // Replicates display_sub regex replacement: scode.replace(/\d+/g, m => sub_arr[m])
            const formattedName =
                resolvedNames.length > 0
                    ? code.replace(/\d+/g, (m) => subMap[m] ?? m)
                    : null;

            // Multi-paper Theory / Practical / MCQ breakdown (`50+20+10-45+20+15`)
            let papers: PaperMarks[] | null = null;
            if (showMarks && !totalOnly && mrksDtls) {
                const mrks = mrksDtls.split("-");
                papers = mrks.map((paperStr, idx) => {
                    const ms = paperStr.split("+");
                    const pCode = codeSplit[idx] ?? code;
                    return {
                        paperCode: pCode,
                        paperName: subMap[pCode] ?? null,
                        theory: ms[0] || null,
                        practical: ms[1] || null,
                        mcq: ms[2] || null,
                    };
                });
            }

            // Re-scrutiny / log diffing
            let log: SubjectEntry["log"] = null;
            if (haveLogMarks) {
                const prev = logMap[code];
                const logTotal = prev?.total ?? "";
                const logGrade = prev?.grade ?? "";

                const totalChanged = logTotal !== "" && total !== logTotal;
                const gradeChanged = logGrade !== "" && grade !== logGrade;

                log = {
                    previousTotal: logTotal || null,
                    previousGrade: logGrade || null,
                    totalChanged,
                    gradeChanged,
                    isChanged: totalChanged || gradeChanged,
                };
            }

            subjects.push({
                rawCode: code,
                codes: codeSplit,
                name: formattedName,
                names: resolvedNames,
                grade: grade || null,
                total: showMarks ? total || null : null,
                papers,
                log,
            });
        }

        return {
            title,
            valueColumnTitle,
            showMarks,
            totalOnly,
            hasLog: haveLogMarks,
            subjects,
        };
    };

    const mainSection = parseSection(
        "Subject-wise Grade/Marks",
        res.display_details,
        res.log_display_details,
    );

    const caSection = parseSection(
        "Subject-wise Grade/Marks for Continuous Assessment",
        res.display_details_ca,
        res.log_display_details_ca,
    );

    const gpaMatch = res.res_detail?.match(/GPA\s*=\s*(\d+(?:\.\d+)?)/i);

    return {
        meta: {
            exam: examKey || null,
            year: !Number.isNaN(examYear) ? examYear : null,
            notice: resp.notice || null,
            subjectFile: resp.sfile || null,
            config: {
                showMarks: resp.showmarks === 1,
                totalOnly: resp.totalonly === 1,
                hideFailed: resp.hidefailed === 1,
            },
        },
        student: {
            rollNo: res.roll_no || null,
            registrationNo:
                res.regno && res.regno !== "[NOT SHOWN]" ? res.regno : null,
            name: res.name || null,
            fatherName: res.fname || null,
            motherName: res.mname || null,
            board: res.board_name || null,
            session: res.session || null,
            groupLabel: res.board_name === "TEC" ? "Trade" : "Group",
            group: res.stud_group || "N/A",
            type: res.stud_type || null,
            gender,
            dob: res.dob || "N/A",
            institute: res.inst_name ?? res.eiin ?? null,
            eiin: res.eiin || null,
            thana: res.t_name || null,
            zilla: res.z_name || null,
            fourthSubjectCode: res.sub4th || null,
            totalFullMarks: res.tot_full ?? null,
            converted1000Marks: res.conv_1000 ?? null,
        },
        result: {
            raw: res.res_detail || null,
            display: res.res_detail === "P" ? "Passed" : res.res_detail || null,
            gpa: gpaMatch ? Number(gpaMatch[1]) : null,
            isPassed:
                res.res_detail === "P" || Boolean(gpaMatch) || false,
        },
        assessments: {
            main: mainSection,
            continuousAssessment: caSection,
        },
    };
}